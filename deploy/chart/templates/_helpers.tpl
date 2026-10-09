{{/*
Base name of all objects. Derived from the release name so that two releases of the
same chart in one cluster do not clash on names.
*/}}
{{- define "app.name" -}}
{{- .Release.Name | trunc 40 | trimSuffix "-" -}}
{{- end -}}

{{/*
Labels shared by all objects. `app.kubernetes.io/*` are names agreed across the whole
ecosystem — k9s, kubectl and most tools filter by them.
*/}}
{{- define "app.labels" -}}
app.kubernetes.io/name: {{ include "app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Full image name. The tag is required and deliberately has no default: a missing tag should
stop the deployment with a clear error rather than silently fall back to "latest".
*/}}
{{- define "app.image" -}}
{{- $tag := required "image.tag is required — it is set by the Argo Application in the platform repo" .Values.image.tag -}}
{{ .Values.image.registry }}/{{ .component }}:{{ $tag }}
{{- end -}}
