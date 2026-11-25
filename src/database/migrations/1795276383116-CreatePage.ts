import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePage1795276383116 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE TABLE "tbl_chapter_pages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "chapter_id" uuid NOT NULL,
        "page_number" integer NOT NULL,
        "object_key" varchar(500) NOT NULL,
        "content_type" varchar(50) NOT NULL,
        "size_bytes" bigint,
        "upload_status" varchar(20) NOT NULL DEFAULT 'pending',
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),

        CONSTRAINT "pk_chapter_pages"
          PRIMARY KEY ("id"),

        CONSTRAINT "uq_chapter_pages_number"
          UNIQUE ("chapter_id", "page_number"),

        CONSTRAINT "uq_chapter_pages_object_key"
          UNIQUE ("object_key"),

        CONSTRAINT "chk_chapter_pages_number"
          CHECK ("page_number" > 0),

        CONSTRAINT "chk_chapter_pages_size"
          CHECK ("size_bytes" IS NULL OR "size_bytes" > 0),

        CONSTRAINT "chk_chapter_pages_status"
          CHECK ("upload_status" IN ('pending', 'ready')),

        CONSTRAINT "chk_chapter_pages_ready_size"
          CHECK (
            "upload_status" <> 'ready'
            OR "size_bytes" IS NOT NULL
          ),

        CONSTRAINT "fk_chapter_pages_chapter"
          FOREIGN KEY ("chapter_id")
          REFERENCES "tbl_chapters"("id")
          ON DELETE RESTRICT
      );
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        DROP TABLE "tbl_chapter_pages";
    `);
    }

}
