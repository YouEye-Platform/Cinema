"use client";



import { useTranslations as useInterfaceTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Loader2, Save, Key, Eye, EyeOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CinemaSettingsPanel({ embedded = false }: { embedded?: boolean }) {
  const translateInterface = useInterfaceTranslations("interface");


  const [region, setRegion] = useState("US");
  const [includeAdult, setIncludeAdult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // API key state
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState<{ configured: boolean; source: string; masked: string | null }>({ configured: false, source: "none", masked: null });
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/settings/api-key").then((r) => r.json()),
    ])
      .then(([settingsData, keyData]) => {
        const s = settingsData.settings || {};
        setRegion((s.tmdb_region as string) || "US");
        setIncludeAdult((s.include_adult as boolean) || false);
        setApiKeyStatus(keyData);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: { tmdb_region: region, include_adult: includeAdult } }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    setSavingKey(true);
    setKeyError(null);
    setKeySaved(false);
    try {
      const res = await fetch("/api/settings/api-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setKeyError(translateInterface("me2446d6606fb"));
      } else {
        setKeySaved(true);
        setApiKeyInput("");
        // Refresh status
        const status = await fetch("/api/settings/api-key").then((r) => r.json());
        setApiKeyStatus(status);
        setTimeout(() => setKeySaved(false), 3000);
      }
    } catch {
      setKeyError(translateInterface("m9f879fb99e2a"));
    } finally {
      setSavingKey(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setSavingKey(true);
    await fetch("/api/settings/api-key", { method: "DELETE" });
    const status = await fetch("/api/settings/api-key").then((r) => r.json());
    setApiKeyStatus(status);
    setSavingKey(false);
  };

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className={embedded ? "p-4" : "mx-auto max-w-lg px-4 py-6"}>
      {!embedded && <h1 className="mb-6 text-2xl font-bold">{translateInterface("m1192ea7d6f4d")}</h1>}

      <div className="space-y-6">
        {/* TMDB API Key */}
        <div className="rounded-lg border border-border/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{translateInterface("meb5a235a7837")}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {translateInterface("mf0a3bce2a488")}{" "}
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              themoviedb.org/settings/api
            </a>
          </p>

          {apiKeyStatus.configured && (
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm font-mono">{apiKeyStatus.masked}</span>
                <span className="text-xs text-muted-foreground">
                  ({apiKeyStatus.source === "settings" ? translateInterface("m30a3f7d4dc3f") : translateInterface("mb5a4a4be1916")})
                </span>
              </div>
              {apiKeyStatus.source === "settings" && (
                <button
                  onClick={handleRemoveApiKey}
                  disabled={savingKey}
                  className="text-xs text-destructive hover:underline"
                >
                  {translateInterface("mc3812fc4acb8")}</button>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => { setApiKeyInput(e.target.value); setKeyError(null); }}
                placeholder={apiKeyStatus.configured ? translateInterface("mf5f4aae55d8d") : translateInterface("m8b5b6c7a9a21")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono pr-9"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              onClick={handleSaveApiKey}
              disabled={savingKey || !apiKeyInput.trim()}
              size="sm"
              className="gap-1 shrink-0"
            >
              {savingKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {translateInterface("m1509f561f241")}</Button>
          </div>

          {keyError && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <X className="h-3.5 w-3.5" />
              {keyError}
            </div>
          )}
          {keySaved && (
            <div className="flex items-center gap-1.5 text-xs text-green-500">
              <Check className="h-3.5 w-3.5" />
              {translateInterface("me161f349b8fb")}</div>
          )}
        </div>

        {/* TMDB Region */}
        <div>
          <label className="text-sm font-medium block mb-1">{translateInterface("md033fe3dbc88")}</label>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="US">{translateInterface("m49dca65f362f")}</SelectItem>
              <SelectItem value="GB">{translateInterface("m8d23a6e37e0a")}</SelectItem>
              <SelectItem value="DE">{translateInterface("m80db4ccdca10")}</SelectItem>
              <SelectItem value="FR">{translateInterface("m7a1ca4ef7515")}</SelectItem>
              <SelectItem value="ES">{translateInterface("m8ef41e6f4b07")}</SelectItem>
              <SelectItem value="RU">{translateInterface("m33a3d8ed92b0")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">{translateInterface("mb592152d3476")}</p>
        </div>

        {/* Include Adult */}
        <div className="flex items-center justify-between py-3 border-b border-border/40">
          <div>
            <p className="text-sm font-medium">{translateInterface("m6742806a207b")}</p>
            <p className="text-xs text-muted-foreground">{translateInterface("m5d7c3766b83a")}</p>
          </div>
          <button
            onClick={() => setIncludeAdult(!includeAdult)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeAdult ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeAdult ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2 w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? translateInterface("med9b760289e6") : translateInterface("mec92e1dc9bb3")}
        </Button>
      </div>
    </div>
  );
}
