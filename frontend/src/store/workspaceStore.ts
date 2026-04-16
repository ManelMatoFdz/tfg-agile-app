import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  workspaceId: string | null;
  setWorkspace: (id: string) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaceId: null,
      setWorkspace: (id) => set({ workspaceId: id }),
      clearWorkspace: () => set({ workspaceId: null }),
    }),
    { name: 'workspace-storage' },
  ),
);