

process.loadEnvFile()

export type ApiConfig = {
    port: string,
    platform: string
}

export type DBConfig = {
    dbUrl: string,
}

const DBURL = envOrThrow("DB_URL")
const PORT = envOrThrow("PORT")
const PLATFORM = envOrThrow("PLATFORM")

export const cfg: { api: ApiConfig, db: DBConfig } = {
    api: {
        port: PORT,
        platform: PLATFORM
    },
    db : {
        dbUrl: DBURL
    }
}

function envOrThrow(key: string) {
  const envVar = process.env[key];
  if (!envVar) {
    throw new Error(`${key} must be set`);
  }
  return envVar;
}