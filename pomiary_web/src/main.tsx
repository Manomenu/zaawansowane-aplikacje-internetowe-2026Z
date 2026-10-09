import "@mantine/core/styles.css";
import "./app.css";

import { MantineProvider, Modal, createTheme } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";

const theme = createTheme({
    primaryColor: "indigo",
    // Shade 6, Mantine's default, is 4.32:1 on white for button labels and links; 7 passes WCAG
    // AA (4.5:1) in the light scheme. The dark scheme's default shade already does.
    primaryShade: { light: 7, dark: 8 },
    defaultRadius: "md",
    components: {
        // Mantine's close button is an icon with no text: without a name a screen reader says
        // only "button" (axe: button-name).
        Modal: Modal.extend({ defaultProps: { closeButtonProps: { "aria-label": "Close" } } }),
    },
});

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

createRoot(root).render(
    <StrictMode>
        <MantineProvider theme={theme} defaultColorScheme="auto">
            <App />
        </MantineProvider>
    </StrictMode>,
);
