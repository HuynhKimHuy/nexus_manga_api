import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMangas1792901379760 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tbl_mangas" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL UNIQUE,
    "cover_image" VARCHAR(500),

    "author" VARCHAR(150),
    "artist" VARCHAR(150),

    "status" VARCHAR(50) NOT NULL DEFAULT 'ongoing',
    "release_year" INT,

    "views" BIGINT NOT NULL DEFAULT 0,
    "rating" NUMERIC(3, 2) NOT NULL DEFAULT 0.00,

    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "chk_mangas_status"
        CHECK (status IN ('ongoing', 'completed', 'hiatus', 'cancelled')),

    CONSTRAINT "chk_mangas_views"
        CHECK (views >= 0),

    CONSTRAINT "chk_mangas_rating"
        CHECK (rating BETWEEN 0 AND 5),

    CONSTRAINT "chk_mangas_release_year"
        CHECK (release_year IS NULL OR release_year > 0)
);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE "tbl_mangas" `);
  }
}
