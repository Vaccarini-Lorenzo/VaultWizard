import { ClientSecretCredential } from "@azure/identity";

export interface AzureClientCredentialsInput {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    authorityHost?: string;
}

export class AzureClientCredentialsTokenProvider {
    private static readonly cognitiveServicesScope = "https://cognitiveservices.azure.com/.default";

    async getAccessToken(azureClientCredentialsInput: AzureClientCredentialsInput): Promise<string> {
        this.ensureNodeLikeRuntime();

        const clientSecretCredential = this.buildClientSecretCredential(azureClientCredentialsInput);
        const accessTokenResult = await clientSecretCredential.getToken(
            AzureClientCredentialsTokenProvider.cognitiveServicesScope
        );

        if (!accessTokenResult?.token) {
            throw new Error("Azure AD token response does not contain an access token.");
        }

        return accessTokenResult.token;
    }

    private ensureNodeLikeRuntime(): void {
        const isBrowserLikeRuntime = typeof window !== "undefined" && typeof document !== "undefined";
        if (isBrowserLikeRuntime) {
            throw new Error(
                "Client credentials auth with @azure/identity is not supported in browser runtime. " +
                "Use API key auth in-browser, or move token acquisition to a Node/backend layer."
            );
        }
    }

    private buildClientSecretCredential(
        azureClientCredentialsInput: AzureClientCredentialsInput
    ): ClientSecretCredential {
        const normalizedAuthorityHost = azureClientCredentialsInput.authorityHost?.trim()
            ? azureClientCredentialsInput.authorityHost.replace(/\/+$/, "")
            : undefined;

        return new ClientSecretCredential(
            azureClientCredentialsInput.tenantId,
            azureClientCredentialsInput.clientId,
            azureClientCredentialsInput.clientSecret,
            normalizedAuthorityHost ? { authorityHost: normalizedAuthorityHost } : undefined
        );
    }
}