import type { CollectionStructure, FileInfo, ProjectInfo } from "./types";

const BASE = "/api";

export async function listProjects(): Promise<ProjectInfo[]> {
  const r = await fetch(`${BASE}/projects`);
  if (!r.ok) throw new Error("Failed to fetch projects");
  return r.json();
}

export async function renameProject(name: string, newName: string): Promise<{ new_name: string }> {
  const r = await fetch(`${BASE}/projects/${name}/rename`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_name: newName }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to rename project");
  }
  return r.json();
}

export async function createProject(name: string): Promise<void> {
  const r = await fetch(`${BASE}/projects/${name}`, { method: "POST" });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to create project");
  }
}

export async function deleteProject(name: string): Promise<void> {
  const r = await fetch(`${BASE}/projects/${name}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Failed to delete project");
}

export async function archiveProject(name: string): Promise<void> {
  const r = await fetch(`${BASE}/projects/${name}/archive`, { method: "POST" });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to archive project");
  }
}

export async function fetchProjectMd(project: string): Promise<string> {
  const r = await fetch(`${BASE}/projects/${project}/project-md`);
  if (!r.ok) throw new Error("Failed to fetch project.md");
  const data = await r.json();
  return data.content;
}

export async function saveProjectMd(project: string, content: string): Promise<void> {
  const r = await fetch(`${BASE}/projects/${project}/project-md`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "project.md", content }),
  });
  if (!r.ok) throw new Error("Failed to save project.md");
}

export async function fetchCollection(project: string): Promise<CollectionStructure> {
  const r = await fetch(`${BASE}/projects/${project}/collection`);
  if (!r.ok) throw new Error("Failed to fetch collection");
  return r.json();
}

export async function saveCollection(project: string, collection: CollectionStructure): Promise<void> {
  const r = await fetch(`${BASE}/projects/${project}/collection`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collection }),
  });
  if (!r.ok) throw new Error("Failed to save collection");
}

export async function fetchMarkdown(project: string, path: string): Promise<string> {
  const r = await fetch(`${BASE}/projects/${project}/markdown/${path}`);
  if (!r.ok) throw new Error("File not found");
  const data = await r.json();
  return data.content;
}

export async function saveMarkdown(project: string, path: string, content: string): Promise<void> {
  const r = await fetch(`${BASE}/projects/${project}/markdown/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content }),
  });
  if (!r.ok) throw new Error("Failed to save file");
}

export async function createFile(project: string, path: string): Promise<{ title: string }> {
  const r = await fetch(`${BASE}/projects/${project}/markdown/${path}`, { method: "POST" });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to create file");
  }
  return r.json();
}

export async function deleteFile(project: string, path: string): Promise<void> {
  const r = await fetch(`${BASE}/projects/${project}/markdown/${path}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Failed to delete file");
}

export async function archiveFile(project: string, path: string): Promise<void> {
  const r = await fetch(`${BASE}/projects/${project}/archive-markdown/${path}`, { method: "POST" });
  if (!r.ok) throw new Error("Failed to archive file");
}

export async function renameFile(project: string, oldPath: string, newPath: string): Promise<{ new_path: string }> {
  const r = await fetch(`${BASE}/projects/${project}/rename/${oldPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_path: newPath }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to rename file");
  }
  return r.json();
}

export async function fetchCollectionYaml(project: string): Promise<string> {
  const r = await fetch(`${BASE}/projects/${project}/collection/yaml`);
  if (!r.ok) throw new Error("Failed to fetch YAML");
  const data = await r.json();
  return data.content;
}

export async function saveCollectionYaml(content: string): Promise<void> {
  const r = await fetch(`${BASE}/collection/yaml`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || "Failed to save YAML");
  }
}

export interface SearchMatch {
  line: number;
  text: string;
}

export interface SearchResult {
  path: string;
  title: string;
  matches: SearchMatch[];
}

export async function searchProject(project: string, query: string): Promise<SearchResult[]> {
  const r = await fetch(`${BASE}/projects/${project}/search?q=${encodeURIComponent(query)}`);
  if (!r.ok) throw new Error("Search failed");
  return r.json();
}

// Frontmatter template

export interface FrontmatterField {
  key: string;
  type: "string" | "list" | "enum" | "boolean" | "date";
  default?: string | string[] | boolean | null;
  options?: string[];
}

export interface FrontmatterTemplate {
  fields: FrontmatterField[];
}

export interface ComplianceItem {
  path: string;
  title: string;
  missing: string[];
  extra: string[];
}

export async function fetchTemplate(project: string): Promise<FrontmatterTemplate> {
  const r = await fetch(`${BASE}/projects/${project}/frontmatter-template`);
  if (!r.ok) throw new Error("Failed to fetch template");
  return r.json();
}

export async function saveTemplate(project: string, template: FrontmatterTemplate): Promise<void> {
  const r = await fetch(`${BASE}/projects/${project}/frontmatter-template`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(template),
  });
  if (!r.ok) throw new Error("Failed to save template");
}

export async function fetchFileFrontmatter(project: string, path: string): Promise<{ path: string; frontmatter: Record<string, any> }> {
  const r = await fetch(`${BASE}/projects/${project}/frontmatter/${path}`);
  if (!r.ok) throw new Error("Failed to fetch frontmatter");
  return r.json();
}

export async function inferTemplateFromFile(project: string, path: string): Promise<FrontmatterTemplate> {
  const r = await fetch(`${BASE}/projects/${project}/frontmatter-template/from-file/${path}`, {
    method: "POST",
  });
  if (!r.ok) throw new Error("Failed to infer template");
  return r.json();
}

export async function fetchCompliance(project: string): Promise<ComplianceItem[]> {
  const r = await fetch(`${BASE}/projects/${project}/frontmatter-compliance`);
  if (!r.ok) throw new Error("Failed to fetch compliance");
  return r.json();
}

export async function batchUpdateFrontmatter(project: string, addDefaults: boolean, stripExtra: boolean, files?: string[]): Promise<{ updated: string[]; count: number }> {
  const r = await fetch(`${BASE}/projects/${project}/frontmatter-batch-update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ add_defaults: addDefaults, strip_extra: stripExtra, files }),
  });
  if (!r.ok) throw new Error("Batch update failed");
  return r.json();
}

export async function fetchOrphans(project: string): Promise<FileInfo[]> {
  const r = await fetch(`${BASE}/projects/${project}/orphans`);
  if (!r.ok) throw new Error("Failed to fetch orphans");
  return r.json();
}

export async function importFromFormat(project: string, format: "mkdocs" | "docusaurus", filename?: string): Promise<{ warnings: string[]; node_count: number }> {
  const body = format === "docusaurus" && filename ? JSON.stringify({ filename }) : undefined;
  const r = await fetch(`${BASE}/projects/${project}/import/${format}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail ?? "Import failed");
  }
  return r.json();
}

export async function exportToFormat(project: string, format: "mkdocs" | "docusaurus"): Promise<{ file_path: string; markdowns_path: string }> {
  const r = await fetch(`${BASE}/projects/${project}/export/${format}`, { method: "POST" });
  if (!r.ok) throw new Error("Export failed");
  return r.json();
}
