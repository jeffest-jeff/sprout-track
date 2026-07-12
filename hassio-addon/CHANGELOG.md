## 1.3.6

- Fix database initialization: patch schema.prisma to absolute /share/sprout-track path before generating the Prisma client, so the CLI and the running app both connect to the same database file

## 1.3.5

- Initial Home Assistant addon release
- Activity tile color customization (per-tile color picker)
- Interface accent color themes (teal, blue, purple, rose, orange, green, indigo)
- Cloudflare Access SSO support for automatic sign-in via tunnel
- MDI icon system throughout the app
- Custom activity support with matching tile sizes
