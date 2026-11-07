import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type MangaStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled';

@Entity('tbl_mangas')
@Check(
  'chk_mangas_status',
  "status IN ('ongoing', 'completed', 'hiatus', 'cancelled')",
)
@Check('chk_mangas_views', 'views >= 0')
@Check('chk_mangas_rating', 'rating BETWEEN 0 AND 5')
@Check('chk_mangas_release_year', 'release_year IS NULL OR release_year > 0')
export class Mangas {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ name: 'cover_image', type: 'varchar', length: 500, nullable: true })
  coverImage: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  author: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  artist: string | null;

  @Column({ type: 'varchar', length: 50, default: 'ongoing' })
  status: MangaStatus;

  @Column({ name: 'release_year', type: 'int', nullable: true })
  releaseYear: number | null;

  // PostgreSQL bigint and numeric values are returned as strings to preserve precision.
  @Column({ type: 'bigint', default: 0 })
  views: string;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  rating: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
