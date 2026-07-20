CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"email" varchar(256) NOT NULL,
	"profile_image" text,
	"username" varchar(30) NOT NULL,
	"hashed_password" varchar NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
