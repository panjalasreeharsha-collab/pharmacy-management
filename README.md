# Medstock Pharmacy Management

Spring Boot pharmacy inventory management with shop accounts, per-shop stock isolation, and MySQL persistence.

## Run locally

Prerequisites: Java 17+ and MySQL.

Create a local database named `storage`, then set the database credentials in environment variables:

```powershell
$env:DB_URL = "jdbc:mysql://localhost:3306/storage?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:DB_USERNAME = "root"
$securePassword = Read-Host "MySQL password" -AsSecureString
$env:DB_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
.\mvnw.cmd spring-boot:run
```

Open `http://localhost:8080`. The application creates its tables at startup.

Automated tests use an isolated in-memory H2 database:

```powershell
.\mvnw.cmd test
```

## Deploy on Render with Aiven MySQL

### 1. Create the Aiven MySQL service

1. Create an Aiven for MySQL service and wait until its status is **Running**.
2. Open the service's connection information and note its host, port, database, and service username.
3. Download the service CA certificate. Use Aiven's default database if you have not created another database.
4. Configure the Aiven service's allowed IPs/network access so Render can reach it. Do not expose MySQL to all clients unless the provider requires it; use the narrowest access rule Aiven and your Render plan support.

Keep the service password private. Do not add it to this repository or a committed `.env` file.

### 2. Create a Render web service

1. In Render, choose **New > Web Service** and connect `panjalasreeharsha-collab/pharmacy-management`.
2. Choose branch `main`, select **Docker** as the runtime, and set the Dockerfile path to `Dockerfile`.
3. Set the health check path to `/`.
4. Under **Environment**, add:

| Key | Value |
| --- | --- |
| `DB_URL` | `jdbc:mysql://<AIVEN_HOST>:<AIVEN_PORT>/<AIVEN_DATABASE>?sslMode=VERIFY_CA&sslCa=/etc/secrets/ca.pem&serverTimezone=UTC` |
| `DB_USERNAME` | The username shown in the Aiven service connection information |
| `DB_PASSWORD` | The Aiven service password |
| `SESSION_COOKIE_SECURE` | `true` |

Replace the angle-bracket placeholders with Aiven's connection values. Keep the JDBC prefix, `sslMode=VERIFY_CA`, and `sslCa` option. The database name must exist; Aiven's provisioned default database is suitable if you have not created another one.

5. Under **Secret Files**, add the downloaded Aiven CA certificate with filename `ca.pem`. Render makes it available at `/etc/secrets/ca.pem`.
6. Save the environment and secret file, then create the service and wait for the deployment to succeed.

The application listens on Render's `PORT` environment variable and initializes its tables in the configured MySQL database. Render's filesystem is not used for inventory persistence; stock data lives in MySQL.

## Verify deployment

1. Open the Render service URL and create a pharmacy account.
2. Add a medicine and refresh the page; it should still be present.
3. In Render's service dashboard, check **Logs** if startup fails. Common causes are an incorrect JDBC URL, database credentials, Aiven network access, or a missing/misnamed CA secret file.

Render's free web services can spin down when idle. Choose a paid web service for an application that must remain continuously available. Confirm current Render and Aiven pricing and plan limits before deploying.
