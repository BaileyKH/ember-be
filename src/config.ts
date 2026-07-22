

process.loadEnvFile()

export type ApiConfig = {
    port: string,
    platform: string,
    jwtSecret: string,
}

export type DBConfig = {
    dbUrl: string,
    defaultDuration: number
}

const DBURL = envOrThrow("DB_URL")
const PORT = envOrThrow("PORT")
const PLATFORM = envOrThrow("PLATFORM")
const JWTSECRET = envOrThrow("JWT_SECRET")

export const cfg: { api: ApiConfig, db: DBConfig } = {
    api: {
        port: PORT,
        platform: PLATFORM,
        jwtSecret: JWTSECRET
    },
    db : {
        dbUrl: DBURL,
        defaultDuration: 3600
    }
}

function envOrThrow(key: string) {
  const envVar = process.env[key];
  if (!envVar) {
    throw new Error(`${key} must be set`);
  }
  return envVar;
}