import { Anchor, Button, Group, Tabs, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

/** A tab of the page; its panel is a `TabPanel` with the same `value`. */
export interface TabSpec {
    value: string;
    label: string;
}

export interface ShellProps {
    /** The logged-in admin's name, or null when logged out. */
    username: string | null;
    onLogIn: () => void;
    onLogOut: () => void;
    /** The tabs the visitor may see, in order. */
    tabs: readonly TabSpec[];
    activeTab: string;
    onTabChange: (value: string) => void;
    /** A message for the whole page, shown under the title (a `Notice`). */
    notice?: ReactNode;
    /** `TabPanel`s, one per tab. */
    children: ReactNode;
}

/** A tab's content. Only the active panel is mounted, so a hidden feature does not fetch. */
export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
    return <Tabs.Panel value={value}>{children}</Tabs.Panel>;
}

/** The page's landmarks: header, nav with the tabs, main with the panels, footer. */
export function Shell({ username, onLogIn, onLogOut, tabs, activeTab, onTabChange, notice, children }: ShellProps) {
    return (
        <div className="page">
            <header className="page-header no-print">
                <Group justify="space-between" align="center" wrap="wrap">
                    <Title order={1} size="h2">
                        Forest conditions
                    </Title>
                    {username === null ? (
                        <Button onClick={onLogIn}>Log in</Button>
                    ) : (
                        <Group gap="sm">
                            <Text>Logged in as {username}</Text>
                            <Button variant="default" onClick={onLogOut}>
                                Log out
                            </Button>
                        </Group>
                    )}
                </Group>
                {notice}
            </header>
            <Tabs
                value={activeTab}
                onChange={(value) => {
                    if (value !== null) onTabChange(value);
                }}
                keepMounted={false}
                className="page-tabs"
            >
                <nav className="page-nav no-print" aria-label="Sections">
                    <Tabs.List>
                        {tabs.map((tab) => (
                            <Tabs.Tab key={tab.value} value={tab.value}>
                                {tab.label}
                            </Tabs.Tab>
                        ))}
                    </Tabs.List>
                </nav>
                <main className="page-main">{children}</main>
            </Tabs>
            <footer className="page-footer no-print">
                <Text size="sm">
                    Weather data by{" "}
                    <Anchor href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                        Open-Meteo.com
                    </Anchor>{" "}
                    (
                    <Anchor href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
                        CC BY 4.0
                    </Anchor>
                    ).
                </Text>
                <Text size="sm" c="dimmed">
                    Measurements come only from sensors, through the API; nobody edits them here.
                </Text>
            </footer>
        </div>
    );
}
