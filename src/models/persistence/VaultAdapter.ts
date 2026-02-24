export interface VaultAdapterListResult {
    files: string[];
    folders: string[];
}

export interface VaultAdapterLike {
    exists(path: string): Promise<boolean>;
    mkdir(path: string): Promise<void>;
    read(path: string): Promise<string>;
    write(path: string, data: string): Promise<void>;
    list(path: string): Promise<VaultAdapterListResult>;
}