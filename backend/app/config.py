from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/nhs_intelligence"
    anthropic_api_key: str = ""
    allowed_origins: str = "http://localhost:3000"
    ai_rate_limit: str = "10/minute"
    cache_ttl_hours: int = 24
    log_level: str = "INFO"
    
    redis_url: str = "redis://localhost:6379"

    # SMTP Settings for Failure Alerts
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    alert_email: str = ""


    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
