import { AuthType, type AvailableProvider } from "@/gql/graphql";
import { Modal } from "@heroui/react";
import { CredentialConnectForm } from "./CredentialConnectForm";
import { OAuthConnectForm } from "./OAuthConnectForm";
import { ProviderIcon } from "./ProviderIcon";

export function ConnectProviderModal({
	provider,
	onClose,
	onConnected,
}: {
	provider: AvailableProvider;
	onClose: () => void;
	onConnected: () => void;
}) {
	return (
		<Modal isOpen onOpenChange={(open) => !open && onClose()}>
			<Modal.Backdrop>
				<Modal.Container>
					<Modal.Dialog>
						<Modal.CloseTrigger onPress={onClose} />
						<Modal.Header>
							<div className="flex items-center gap-2">
								<ProviderIcon type={provider.type} size={18} />
							</div>
							<Modal.Heading>Connect {provider.label}</Modal.Heading>
						</Modal.Header>

						{provider.authType === AuthType.Oauth ? (
							<OAuthConnectForm provider={provider} onClose={onClose} />
						) : (
							<CredentialConnectForm provider={provider} onClose={onClose} onConnected={onConnected} />
						)}
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
		</Modal>
	);
}
