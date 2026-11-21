import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChapter1795186871950 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      CREATE TABLE "tbl_chapters" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "manga_id" uuid NOT NULL,
        "number" numeric(8,2) NOT NULL,
        "title" varchar(255),
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),

        CONSTRAINT "pk_chapters" PRIMARY KEY ("id"),

        CONSTRAINT "uq_chapters_manga_number"
          UNIQUE ("manga_id", "number"),

        CONSTRAINT "chk_chapters_number"
          CHECK ("number" > 0),

        CONSTRAINT "chk_chapters_status"
          CHECK ("status" IN ('draft', 'published')),

        CONSTRAINT "fk_chapters_manga"
          FOREIGN KEY ("manga_id")
          REFERENCES "tbl_mangas"("id")
          ON DELETE RESTRICT
      );
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
             DROP TABLE "tbl_chapters";
             `)
    }

}
