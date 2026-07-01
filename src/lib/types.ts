export type LogoVariant = "default" | "icon" | "wordmark";

export interface LogoFile {
  filename: string;
  staticallyUrl: string;
  role: LogoVariant;
  format: "svg";
  scalable: true;
}

export interface LogoEntry {
  shortname: string;
  name: string;
  url: string | null;
  files: LogoFile[];
  categories: Category[];
  tags: Tag[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  logoCount?: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  logoCount?: number;
}

export interface LogosJsonEntry {
  name: string;
  shortname: string;
  url: string;
  files: string[];
}

export interface LogoListResult {
  items: LogoEntry[];
  total: number;
  page: number;
  pageSize: number;
}
