from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx2 import Response
from pydantic import BaseModel

from pomiary_server import problems
from pomiary_server.app import app as real_app
from pomiary_server.problems import Conflict, FieldError, Unprocessable


class Item(BaseModel):
    value: int


def build_app() -> FastAPI:
    app = FastAPI()
    problems.install(app)

    @app.post("/items")
    def create(item: Item) -> Item:
        return item

    @app.get("/items")
    def search(limit: int = 1) -> list[int]:
        return [limit]

    @app.get("/unprocessable")
    def unprocessable() -> None:
        raise Unprocessable("Rule broken", [FieldError(field="minValue", message="must be below maxValue")])

    @app.get("/conflict")
    def conflict() -> None:
        raise Conflict("Clashes with stored data")

    @app.get("/boom")
    def boom() -> None:
        raise RuntimeError("secret internals")

    return app


client = TestClient(build_app(), raise_server_exceptions=False)


def assert_problem(response: Response, status: int) -> dict[str, Any]:
    assert response.status_code == status
    assert response.headers["content-type"] == "application/problem+json"
    body = response.json()
    assert body["status"] == status
    assert body["type"] == "about:blank"
    assert body["title"]
    return body


def test_invalid_json_is_400() -> None:
    response = client.post("/items", content='{"value":', headers={"Content-Type": "application/json"})

    assert_problem(response, 400)


def test_a_missing_field_is_400_and_names_it() -> None:
    body = assert_problem(client.post("/items", json={}), 400)

    assert body["errors"] == [{"field": "value", "message": "Field required"}]


def test_a_bad_query_value_is_400_and_names_it() -> None:
    body = assert_problem(client.get("/items", params={"limit": "many"}), 400)

    assert [error["field"] for error in body["errors"]] == ["limit"]


def test_a_business_rule_is_422_with_errors() -> None:
    body = assert_problem(client.get("/unprocessable"), 422)

    assert body["errors"] == [{"field": "minValue", "message": "must be below maxValue"}]


def test_a_clash_is_409() -> None:
    assert_problem(client.get("/conflict"), 409)


def test_an_unknown_route_is_404_problem() -> None:
    assert_problem(client.get("/nowhere"), 404)


def test_a_wrong_method_is_405_problem() -> None:
    response = client.delete("/items")

    assert_problem(response, 405)
    assert "allow" in response.headers


def test_an_unacceptable_accept_is_406() -> None:
    assert_problem(client.get("/items", headers={"Accept": "application/xml"}), 406)


def test_acceptable_accepts_pass() -> None:
    for accept in [
        "application/json",
        "application/problem+json",
        "*/*",
        "application/*",
        "text/html, application/json;q=0.5",
        "application/xml, */*;q=0.1",
    ]:
        assert client.get("/items", headers={"Accept": accept}).status_code == 200, accept


def test_a_request_without_accept_passes() -> None:
    assert client.get("/items", headers={"Accept": ""}).status_code == 200


def test_json_refused_with_q0_is_406() -> None:
    assert_problem(client.get("/items", headers={"Accept": "application/json;q=0"}), 406)


def test_a_text_body_is_415() -> None:
    assert_problem(client.post("/items", content="value=1", headers={"Content-Type": "text/plain"}), 415)


def test_a_body_without_content_type_is_415() -> None:
    assert_problem(client.post("/items", content=b'{"value": 1}', headers={"Content-Type": ""}), 415)


def test_json_with_a_charset_is_fine() -> None:
    response = client.post("/items", content='{"value": 1}', headers={"Content-Type": "application/json; charset=utf-8"})

    assert response.status_code == 200


def test_a_post_without_a_body_needs_no_content_type() -> None:
    # The 405 shows the request got past the 415 check to routing.
    assert_problem(client.post("/boom"), 405)


def test_security_headers_are_on_every_response() -> None:
    for response in [
        client.get("/items"),
        client.get("/nowhere"),
        client.get("/items", headers={"Accept": "application/xml"}),
        client.get("/boom"),
    ]:
        assert response.headers["x-content-type-options"] == "nosniff"
        assert "default-src 'none'" in response.headers["content-security-policy"]
        assert response.headers["referrer-policy"] == "no-referrer"


def test_an_unexpected_error_is_a_bare_500() -> None:
    response = client.get("/boom")

    body = assert_problem(response, 500)
    assert "secret internals" not in response.text
    assert "Traceback" not in response.text
    assert set(body) == {"type", "title", "status", "detail"}


def test_the_real_app_answers_404_as_a_problem_and_allows_no_wildcard_origin() -> None:
    real = TestClient(real_app)

    response = real.get("/nowhere", headers={"Origin": "https://evil.example"})

    assert_problem(response, 404)
    assert "access-control-allow-origin" not in response.headers
    assert "access-control-allow-credentials" not in response.headers


def test_the_swagger_page_opens_in_a_browser_without_a_csp() -> None:
    response = TestClient(real_app).get("/docs", headers={"Accept": "text/html"})

    assert response.status_code == 200
    assert "content-security-policy" not in response.headers
    assert response.headers["x-content-type-options"] == "nosniff"


def test_the_swagger_page_asks_for_the_schema_under_the_public_prefix() -> None:
    # Behind nginx and the Vite proxy only /api/... reaches the server; /openapi.json would be
    # the web app's index.html.
    page = TestClient(real_app).get("/docs", headers={"Accept": "text/html"}).text

    assert "url: '/api/openapi.json'" in page
