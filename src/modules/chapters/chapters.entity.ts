
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Check,
} from 'typeorm';

import { Mangas } from '../mangas/mangas.entity.js';

export type ChapterStatus = 'draft' | 'published';

@Entity('tbl_chapters')
@Unique('uq_chapters_manga_number', ['mangaId', 'number'])
@Check('chk_chapters_number', '"number" > 0')
@Check(
  'chk_chapters_status',
  `"status" IN ('draft', 'published')`,
)
export class Chapters {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'pk_chapters',
  })
  id: string;

  @Column({ name: 'manga_id', type: 'uuid' })
  mangaId: string;

  @ManyToOne(() => Mangas, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'manga_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_chapters_manga',
  })
  manga: Mangas;

  @Column({ type: 'numeric', precision: 8, scale: 2 })
  number: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: ChapterStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
