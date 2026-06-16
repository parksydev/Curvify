import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProjectDocument } from '@/lib/types';
import type { Database, Json, ProjectRow } from './database.types';

export interface ProjectMeta {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

type Client = SupabaseClient<Database>;

export function toProjectMeta(row: Pick<ProjectRow, 'id' | 'title' | 'updated_at' | 'created_at'>): ProjectMeta {
  return {
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

export async function listProjects(client: Client, userId: string): Promise<ProjectMeta[]> {
  const { data, error } = await client
    .from('projects')
    .select('id, title, updated_at, created_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toProjectMeta);
}

export async function getProject(client: Client, projectId: string): Promise<ProjectRow> {
  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createProject(
  client: Client,
  userId: string,
  title: string,
  doc: ProjectDocument,
): Promise<ProjectMeta> {
  const { data, error } = await client
    .from('projects')
    .insert({
      user_id: userId,
      title,
      data: doc as unknown as Json,
    })
    .select('id, title, updated_at, created_at')
    .single();

  if (error) throw new Error(error.message);
  return toProjectMeta(data);
}

export async function updateProject(
  client: Client,
  projectId: string,
  title: string,
  doc: ProjectDocument,
): Promise<ProjectMeta> {
  const { data, error } = await client
    .from('projects')
    .update({
      title,
      data: doc as unknown as Json,
    })
    .eq('id', projectId)
    .select('id, title, updated_at, created_at')
    .single();

  if (error) throw new Error(error.message);
  return toProjectMeta(data);
}

export async function renameProject(client: Client, projectId: string, title: string): Promise<void> {
  const { error } = await client.from('projects').update({ title }).eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function deleteProject(client: Client, projectId: string): Promise<void> {
  const { error } = await client.from('projects').delete().eq('id', projectId);
  if (error) throw new Error(error.message);
}

export function parseProjectDocument(data: unknown): ProjectDocument {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid project data.');
  }
  const doc = data as ProjectDocument;
  if (doc.version !== 1) {
    throw new Error('Unsupported project version.');
  }
  return doc;
}
