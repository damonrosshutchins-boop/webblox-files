# webblox-files

Roblox `WebClientApp` engine files for WebBlox, fetched by the "Fetch vendor" GitHub Action into `vendor/`.
Files over 19 MB are split into `.partNN` pieces; the player's service worker rejoins them.

Published as a static site with GitHub Pages:

- Site: https://damonrosshutchins-boop.github.io/webblox-files/
- Files: https://damonrosshutchins-boop.github.io/webblox-files/vendor/

Run the fetch from the Actions tab → Fetch vendor → Run workflow.
