CREATE TABLE "trip_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"trip_id" uuid NOT NULL,
	"uploaded_by" uuid,
	"image_path" text NOT NULL,
	"thumbnail_path" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	CONSTRAINT "trip_photos_image_path_unique" UNIQUE("image_path"),
	CONSTRAINT "trip_photos_thumbnail_path_unique" UNIQUE("thumbnail_path")
);
--> statement-breakpoint
ALTER TABLE "trip_photos" ADD CONSTRAINT "trip_photos_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_photos" ADD CONSTRAINT "trip_photos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trip_photos_trip_created_idx" ON "trip_photos" USING btree ("trip_id","created_at","id");--> statement-breakpoint
CREATE INDEX "trip_photos_uploaded_by_idx" ON "trip_photos" USING btree ("uploaded_by");