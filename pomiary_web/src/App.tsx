import { useState } from "react";

import { LoginModal } from "./session/LoginModal";
import { PasswordForm } from "./session/PasswordForm";
import { useSession } from "./session/useSession";
import { Notice } from "./shell/Notice";
import { Shell, TabPanel, type TabSpec } from "./shell/Shell";

const DATA_TAB: TabSpec = { value: "data", label: "Data" };
/** The tabs only a logged-in admin sees. */
const ADMIN_TABS: readonly TabSpec[] = [
    { value: "series", label: "Series" },
    { value: "sensors", label: "Sensors" },
    { value: "account", label: "Account" },
];

/**
 * Puts the page together from features. Each feature has one marked spot below; replace the
 * placeholder with the feature's screen. Admin screens get `token` and `onUnauthorized` (call
 * it when an admin call answers 401: the session ends and the page says so).
 */
export function App() {
    const { session, notice, logIn, logOut, onUnauthorized, dismissNotice } = useSession();
    const [tab, setTab] = useState(DATA_TAB.value);
    const [loginOpen, setLoginOpen] = useState(false);

    const tabs = session === null ? [DATA_TAB] : [DATA_TAB, ...ADMIN_TABS];
    // After logging out on an admin tab the page falls back to the public one.
    const activeTab = tabs.some((t) => t.value === tab) ? tab : DATA_TAB.value;

    return (
        <>
            <Shell
                username={session?.username ?? null}
                onLogIn={() => {
                    setLoginOpen(true);
                }}
                onLogOut={() => void logOut()}
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setTab}
                notice={<Notice message={notice ?? ""} onClose={dismissNotice} />}
            >
                <TabPanel value="data">
                    {/* FEATURE SPOT dashboard/: public screen, no token. Replace the placeholder. */}
                    <p>Data: coming soon.</p>
                </TabPanel>
                {session !== null && (
                    <>
                        <TabPanel value="series">
                            {/* FEATURE SPOT series/: admin screen, gets session.token and onUnauthorized. */}
                            <p>Series: coming soon.</p>
                        </TabPanel>
                        <TabPanel value="sensors">
                            {/* FEATURE SPOT sensors/: admin screen, gets session.token and onUnauthorized. */}
                            <p>Sensors: coming soon.</p>
                        </TabPanel>
                        <TabPanel value="account">
                            <PasswordForm token={session.token} onUnauthorized={onUnauthorized} />
                        </TabPanel>
                    </>
                )}
            </Shell>
            <LoginModal
                opened={loginOpen && session === null}
                onClose={() => {
                    setLoginOpen(false);
                }}
                onLoggedIn={(next) => {
                    logIn(next);
                    setLoginOpen(false);
                }}
            />
        </>
    );
}
