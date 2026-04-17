import type { CollectionStructure, FileInfo, ProjectInfo } from "./types";

const BASE = "/api";

export interface ImageInfo { name: string; size: number; }

export async function listImages(project: string): Promise<ImageInfo[]> {
  const r = await fetch(`${BASE}/projects/${project}/images`);
  if (!r.ok) throw new Error("Failed to list images");
  return r.json();
}

export async function uploadImages(project: string, files: FileList): Promise<{ uploaded: string[] }> {
  const form = new FormData();
  for (const f of Array.from(files)) form.append("files", f);
  const r = await fetch(`${BASE}/projects/${project}/images`, { method: "POST", body: form });
  if (!r.ok) throw new Error("Upload failed");
  return r.json();
}

export async function deleteImage(project: string, filename: string): Promise<void> {
  const r = await fetch(`${BASE}/projects/${project}/image/${encodeURIComponent(filename)}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Failed to delete image");
}

export async function openImagesFolder(project: string): Promise<void> {
  const r = await fetch(`${BASE}/projects/${project}/images/open-folder`);
  if (!r.ok) throw new Error("Failed to open images folder");
}

export interface RootInfo {
  path: string;
  name: string;
  description: string;
  last_project: string | null;
  active: boolean;
}

export async function fetchConfig(): Promise<{ roots: RootInfo[]; active_root: string }> {
  const r = await fetch(`${BASE}/config`);
  if (!r.ok) throw new Error("Failed to fetch config");
  return r.json();
}

export async function fetchRoots(): Promise<RootInfo[]> {
  const r = await fetch(`${BASE}/roots`);
  if (!r.ok) throw new Error("Failed to fetch roots");
  return r.json();
}

export async function addRoot(path: string, name: string, description: string, createDir: boolean): Promise<{ path: string; name: string }> {
  const r = await fetch(`${BASE}/roots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, name, description, create_dir: createDir }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to add root");
  }
  return r.json();
}

export async function removeRoot(path: string): Promise<void> {
  const r = await fetch(`${BASE}/roots`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to remove root");
  }
}

export async function switchRoot(path: string): Promise<{ active_project: string | null; projects: ProjectInfo[] }> {
  const r = await fetch(`${BASE}/roots/active`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to switch root");
  }
  return r.json();
}

export async function setLastProject(project: string): Promise<void> {
  await fetch(`${BASE}/config/last-project`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project }),
  });
}

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

export async function saveCollectionYaml(project: string, content: string): Promise<void> {
  const r = await fetch(`${BASE}/projects/${project}/collection/yaml`, {
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

// Unified template

export interface TemplateComplianceItem {
  path: string;
  title: string;
  missing_keys: string[];
  extra_keys: string[];
  missing_headings: string[];
}

export async function fetchTemplate(project: string): Promise<{ content: string }> {
  const r = await fetch(`${BASE}/projects/${project}/template`);
  if (!r.ok) throw new Error("Failed to fetch template");
  return r.json();
}

export async function saveTemplate(project: string, content: string): Promise<void> {
  const r = await fetch(`${BASE}/projects/${project}/template`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!r.ok) throw new Error("Failed to save template");
}

export async function deleteTemplate(project: string): Promise<void> {
  const r = await fetch(`${BASE}/projects/${project}/template`, { method: "DELETE" });
  if (!r.ok) throw new Error("Failed to delete template");
}

export async function fetchTemplateCompliance(project: string): Promise<TemplateComplianceItem[]> {
  const r = await fetch(`${BASE}/projects/${project}/template/compliance`);
  if (!r.ok) throw new Error("Failed to fetch compliance");
  return r.json();
}

export async function applyTemplate(project: string, path: string, removeExtra = false): Promise<{ content: string }> {
  const r = await fetch(`${BASE}/projects/${project}/template/apply/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remove_extra: removeExtra }),
  });
  if (!r.ok) throw new Error("Failed to apply template");
  return r.json();
}

export async function batchApplyTemplate(project: string, files: string[], removeExtra = false): Promise<{ updated: string[]; count: number }> {
  const r = await fetch(`${BASE}/projects/${project}/template/batch-apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files, remove_extra: removeExtra }),
  });
  if (!r.ok) throw new Error("Batch apply failed");
  return r.json();
}

export async function useFileAsTemplate(project: string, path: string): Promise<{ content: string }> {
  const r = await fetch(`${BASE}/projects/${project}/template/from-file/${path}`, { method: "POST" });
  if (!r.ok) throw new Error("Failed to save as template");
  return r.json();
}

export async function fetchOrphans(project: string): Promise<FileInfo[]> {
  const r = await fetch(`${BASE}/projects/${project}/orphans`);
  if (!r.ok) throw new Error("Failed to fetch orphans");
  return r.json();
}

export async function importFromFormat(project: string, format: "mkdocs" | "docusaurus", filename?: string): Promise<void> {
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

export async function exportToFormat(project: string, format: "mkdocs" | "docusaurus"): Promise<{ path: string }> {
  const r = await fetch(`${BASE}/projects/${project}/export/${format}`, { method: "POST" });
  if (!r.ok) throw new Error("Export failed");
  return r.json();
}


export async function browseStartDir(project?: string): Promise<string> {
  const q = project ? `?project=${encodeURIComponent(project)}` : "";
  const r = await fetch(`${BASE}/browse/start-dir${q}`);
  if (!r.ok) return "";
  const data = await r.json();
  return data.path ?? "";
}

export async function browseDirs(path: string = ""): Promise<{ path: string; parent: string | null; dirs: string[]; files: string[] }> {
  const r = await fetch(`${BASE}/browse/dirs?path=${encodeURIComponent(path)}`);
  if (!r.ok) throw new Error("Failed to list directory");
  return r.json();
}

export async function importMarkdowns(path: string): Promise<{ name: string; title: string }> {
  const r = await fetch(`${BASE}/projects/import-markdowns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to import markdowns");
  }
  return r.json();
}

export async function importFiles(project: string, files: string[]): Promise<{ copied: string[]; count: number }> {
  const r = await fetch(`${BASE}/projects/import-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, files }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to import files");
  }
  return r.json();
}

export async function flattenHierarchy(project: string): Promise<void> {
  const r = await fetch(`${BASE}/projects/${encodeURIComponent(project)}/flatten`, { method: "POST" });
  if (!r.ok) throw new Error("Failed to flatten hierarchy");
}

export async function restoreHierarchy(project: string): Promise<void> {
  const r = await fetch(`${BASE}/projects/${encodeURIComponent(project)}/restore-hierarchy`, { method: "POST" });
  if (!r.ok) throw new Error("Failed to restore hierarchy");
}

export async function checkHierarchyBackup(project: string): Promise<boolean> {
  const r = await fetch(`${BASE}/projects/${encodeURIComponent(project)}/hierarchy-backup`);
  if (!r.ok) return false;
  const data = await r.json();
  return data.exists ?? false;
}

export async function restoreDocStructure(): Promise<void> {
  const r = await fetch(`${BASE}/projects/documentation/restore-structure`, { method: "POST" });
  if (!r.ok) throw new Error("Restore failed");
}

export async function restoreDocAll(): Promise<void> {
  const r = await fetch(`${BASE}/projects/documentation/restore-all`, { method: "POST" });
  if (!r.ok) throw new Error("Restore failed");
}

// Link validation

export interface BrokenLink {
  text: string;
  target: string;
  line: number;
}

export interface FileLinkReport {
  path: string;
  title: string;
  broken_links: BrokenLink[];
}

export interface IncomingLink {
  path: string;
  title: string;
  links: BrokenLink[];
}

export async function validateProjectLinks(project: string): Promise<FileLinkReport[]> {
  const r = await fetch(`${BASE}/projects/${project}/links/validate`);
  if (!r.ok) throw new Error("Validation failed");
  return r.json();
}

export async function validateFileLinks(project: string, path: string): Promise<BrokenLink[]> {
  const r = await fetch(`${BASE}/projects/${project}/links/validate/${path}`);
  if (!r.ok) throw new Error("Validation failed");
  return r.json();
}

export async function fetchIncomingLinks(project: string, path: string): Promise<IncomingLink[]> {
  const r = await fetch(`${BASE}/projects/${project}/links/incoming/${path}`);
  if (!r.ok) throw new Error("Failed to fetch incoming links");
  return r.json();
}
