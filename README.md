<div align="center">
  <h1>Meetfy</h1>
  <p>CLI for creating instant meetings and reserving time in Google Calendar. No credentials file on your machine — auth via hosted OAuth.</p>

  [![npm](https://img.shields.io/npm/v/meetfy)](https://www.npmjs.com/package/meetfy)
  [![npm downloads](https://img.shields.io/npm/dw/meetfy)](https://www.npmjs.com/package/meetfy)
</div>

---

## Install

```sh
npm install -g meetfy
```

Or with pnpm:

```sh
pnpm add -g meetfy
```

## Usage

### First time: authenticate

Sign in with Google (opens the browser and uses the hosted Auth Worker — no local credentials):

```sh
meetfy auth
```

### Create a meeting

Creates an instant meeting and reserves **30 minutes** in your calendar. Asks for title, description, and participants if not passed.

```sh
meetfy create
```

With options (no prompts):

```sh
meetfy create --title "Sync with team" --description "Weekly sync"
meetfy create -t "1:1" -d "Catch up" -p "alice@example.com,bob@example.com"
```

### See your next meeting

```sh
meetfy next
```

### Log out

```sh
meetfy logout
```

## JSON output

Use `--json` for scriptable output (auth, create, next).

```sh
meetfy --json auth
meetfy --json create --title "Standup"
meetfy --json next
```

Example (create success):

```json
{"success":true,"meeting":{"title":"Standup","hangoutLink":"https://meet.google.com/...","startTime":"...","endTime":"..."}}
```

Example (not authenticated):

```json
{"success":false,"error":"auth_required"}
```

## Commands

| Command | Description |
|--------|-------------|
| `meetfy auth` | Authenticate with Google Calendar (opens browser) |
| `meetfy create` | Create an instant meeting (30 min) and reserve time |
| `meetfy next` | Show your next scheduled meeting |
| `meetfy logout` | Log out from Google |

### Options (global)

| Option | Description |
|--------|-------------|
| `--json` | Output result as JSON (for scripts) |

### Options (`create`)

| Option | Short | Description |
|--------|--------|-------------|
| `--title <title>` | `-t` | Meeting title |
| `--description <description>` | `-d` | Meeting description |
| `--participants <emails>` | `-p` | Comma-separated participant emails |


## Requirements

- Node.js **≥ 22**

## License

ISC
