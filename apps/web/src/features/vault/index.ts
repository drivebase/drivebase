// Components
export { VaultFileBrowser } from "./components/VaultFileBrowser";
export { VaultSetupWizard } from "./components/VaultSetupWizard";
export { VaultUnlockPrompt } from "./components/VaultUnlockPrompt";

// Hooks
export { useVaultCrypto } from "./hooks/useVaultCrypto";
export { useVaultFileActions } from "./hooks/useVaultFileActions";
export { useVaultUpload } from "./hooks/useVaultUpload";
export {
	useChangeVaultPassphrase,
	useCreateVaultFolder,
	useDeleteVaultFile,
	useInitiateVaultChunkedUpload,
	useMyVault,
	useRenameVaultFile,
	useRequestVaultDownload,
	useRequestVaultUpload,
	useSetupVault,
	useStarVaultFile,
	useUnstarVaultFile,
	useVaultContents,
} from "./hooks/useVault";

// Store
export { useVaultStore } from "./store/vaultStore";

// Crypto library (for direct use where needed)
export * from "./lib/crypto";
