ALTER TABLE "prazos" ADD COLUMN "defesa" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "modalidade" text;--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "ato" text;
