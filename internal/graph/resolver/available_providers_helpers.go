package resolver

import "github.com/drivebase/drivebase/internal/graph"

var availableProviders = []*graph.AvailableProvider{
	{
		Type:        graph.ProviderTypeGoogleDrive,
		Label:       "Google Drive",
		Description: "Connect your Google Drive account to manage files.",
		AuthType:    graph.AuthTypeOauth,
		Fields:      []*graph.ProviderFieldDef{},
	},
	{
		Type:        graph.ProviderTypeS3,
		Label:       "S3 / MinIO",
		Description: "Connect any S3-compatible storage (AWS S3, MinIO, Backblaze B2, etc.).",
		AuthType:    graph.AuthTypeAPIKey,
		Fields: []*graph.ProviderFieldDef{
			{Name: "endpoint", Label: "Endpoint URL", Type: graph.FieldTypeURL, Required: false, Placeholder: strPtr("https://s3.amazonaws.com"), Description: strPtr("Leave blank for AWS S3. Required for MinIO or other S3-compatible services."), Secret: false},
			{Name: "region", Label: "Region", Type: graph.FieldTypeText, Required: true, Placeholder: strPtr("us-east-1"), Secret: false},
			{Name: "bucket", Label: "Bucket", Type: graph.FieldTypeText, Required: true, Placeholder: strPtr("my-bucket"), Secret: false},
			{Name: "access_key", Label: "Access Key", Type: graph.FieldTypeText, Required: true, Secret: false},
			{Name: "secret_key", Label: "Secret Key", Type: graph.FieldTypePassword, Required: true, Secret: true},
			{Name: "use_path_style", Label: "Use Path Style", Type: graph.FieldTypeBoolean, Required: false, Description: strPtr("Enable for MinIO and other non-AWS S3 services."), Secret: false},
		},
	},
	{
		Type:        graph.ProviderTypeLocal,
		Label:       "Local Filesystem",
		Description: "Store files on the server's local filesystem.",
		AuthType:    graph.AuthTypeNone,
		Fields: []*graph.ProviderFieldDef{
			{Name: "base_path", Label: "Base Path", Type: graph.FieldTypeText, Required: true, Placeholder: strPtr("/data/files"), Description: strPtr("Absolute path on the server where files will be stored."), Secret: false},
		},
	},
}

