import type { BackendDefinition } from '@shared/types'

export const BACKEND_DEFINITIONS: BackendDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CLOUD STORAGE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'drive',
    displayName: 'Google Drive',
    description: 'Google Drive is a file storage and synchronization service developed by Google.',
    category: 'Cloud Storage',
    tier: 'core',
    options: [
      { name: 'client_id', displayName: 'Client ID', type: 'string', description: 'OAuth Client Id. Normally leave blank to use rclone defaults.', required: false, advanced: true, placeholder: 'Leave blank for rclone defaults' },
      { name: 'client_secret', displayName: 'Client Secret', type: 'string', description: 'OAuth Client Secret. Normally leave blank to use rclone defaults.', required: false, advanced: true, sensitive: true },
      { name: 'scope', displayName: 'Scope', type: 'enum', description: 'Scope that rclone should use when requesting access from drive.', required: false, default: 'drive', enumValues: [{ label: 'Full access (drive)', value: 'drive' }, { label: 'Read-only access (drive.readonly)', value: 'drive.readonly' }, { label: 'File access (drive.file)', value: 'drive.file' }], advanced: false },
      { name: 'root_folder_id', displayName: 'Root Folder ID', type: 'string', description: 'ID of the root folder. Leave blank for all files.', required: false, advanced: false, placeholder: 'e.g. 1234567890abcdef' },
      { name: 'service_account_file', displayName: 'Service Account File', type: 'string', description: 'Service Account Credentials JSON file path.', required: false, advanced: true },
      { name: 'token', displayName: 'Token', type: 'string', description: 'OAuth token. Managed automatically by the app.', required: false, advanced: true, sensitive: true },
      { name: 'team_drive', displayName: 'Shared Drive ID', type: 'string', description: 'ID of the Shared Drive to access.', required: false, advanced: false },
      { name: 'auth_owner_only', displayName: 'Auth Owner Only', type: 'bool', description: 'Only consider files owned by the authenticated user.', required: false, default: false, advanced: true },
      { name: 'use_trash', displayName: 'Use Trash', type: 'bool', description: 'Send files to the trash instead of deleting permanently.', required: false, default: true, advanced: false },
      { name: 'skip_gdocs', displayName: 'Skip Google Docs', type: 'bool', description: 'Skip Google Documents files.', required: false, default: false, advanced: true },
      { name: 'skip_shortcuts', displayName: 'Skip Shortcuts', type: 'bool', description: 'Skip Google Drive shortcuts.', required: false, default: false, advanced: true },
      { name: 'export_formats', displayName: 'Export Formats', type: 'string', description: 'Comma-separated list of preferred formats for exporting Google Docs.', required: false, advanced: true },
      { name: 'import_formats', displayName: 'Import Formats', type: 'string', description: 'Comma-separated list of formats rclone can import Google Docs to.', required: false, advanced: true },
      { name: 'use_created_date', displayName: 'Use Created Date', type: 'bool', description: 'Use created date as modification date.', required: false, default: false, advanced: true },
      { name: 'shared_with_me', displayName: 'Shared With Me', type: 'bool', description: 'Only show files shared with me.', required: false, default: false, advanced: true },
      { name: 'trashed_only', displayName: 'Trashed Only', type: 'bool', description: 'Only show files that are in the trash.', required: false, default: false, advanced: true },
      { name: 'starred_only', displayName: 'Starred Only', type: 'bool', description: 'Only show starred files.', required: false, default: false, advanced: true },
      { name: 'acknowledge_abuse', displayName: 'Acknowledge Abuse', type: 'bool', description: 'Set to true if you want to download large files with virus scan warning.', required: false, default: false, advanced: true },
      { name: 'disable_http2', displayName: 'Disable HTTP/2', type: 'bool', description: 'Disable HTTP/2 for Google Drive API.', required: false, default: false, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    oauth: { required: true, authUrl: 'https://accounts.google.com/o/oauth2/auth', tokenUrl: 'https://oauth2.googleapis.com/token', scopes: ['https://www.googleapis.com/auth/drive'] },
    features: { hashTypes: ['md5', 'sha1', 'sha256'], readOnly: false, writeOnly: false, caseInsensitive: true, caseSensitive: false, duplicateFiles: false, serverSideCopy: true, serverSideMove: true }
  },
  {
    name: 's3',
    displayName: 'Amazon S3',
    description: 'Amazon Simple Storage Service (S3) and S3-compatible object storage.',
    category: 'Cloud Storage',
    tier: 'core',
    options: [
      { name: 'provider', displayName: 'Provider', type: 'enum', description: 'Choose your S3 provider.', required: true, advanced: false, enumValues: [
        { label: 'AWS', value: 'AWS' }, { label: 'Alibaba', value: 'Alibaba' }, { label: 'Ceph', value: 'Ceph' },
        { label: 'DigitalOcean', value: 'DigitalOcean' }, { label: 'Dreamhost', value: 'Dreamhost' },
        { label: 'Equinix Metal', value: 'EquinixMetal' }, { label: 'GCS', value: 'GCS' },
        { label: 'Huawei OBS', value: 'HuaweiOBS' }, { label: 'IBMCOS', value: 'IBMCOS' },
        { label: 'IDrive', value: 'IDrive' }, { label: 'ILIAS', value: 'ILIAS' },
        { label: 'Lyve Cloud', value: 'LyveCloud' }, { label: 'Minio', value: 'Minio' },
        { label: 'Netease', value: 'Netease' }, { label: 'ORacle', value: 'Other' },
        { label: 'Petabase', value: 'Petabase' }, { label: 'Qiniu', value: 'Qiniu' },
        { label: 'Rackspace', value: 'Rackspace' }, { label: 'Rclone', value: 'Rclone' },
        { label: 'Scaleway', value: 'Scaleway' }, { label: 'SeaweedFS', value: 'SeaweedFS' },
        { label: 'StackPath', value: 'StackPath' }, { label: 'Storj', value: 'Storj' },
        { label: 'Wasabi', value: 'Wasabi' }, { label: 'Other', value: 'Other' }
      ]},
      { name: 'access_key_id', displayName: 'Access Key ID', type: 'string', description: 'AWS Access Key ID.', required: false, advanced: false, sensitive: true },
      { name: 'secret_access_key', displayName: 'Secret Access Key', type: 'string', description: 'AWS Secret Access Key.', required: false, advanced: false, sensitive: true },
      { name: 'region', displayName: 'Region', type: 'string', description: 'Region to connect to.', required: false, advanced: false, placeholder: 'e.g. us-east-1' },
      { name: 'endpoint', displayName: 'Endpoint', type: 'string', description: 'Custom endpoint for S3-compatible services.', required: false, advanced: false, placeholder: 'e.g. s3.example.com' },
      { name: 'bucket_acl', displayName: 'Bucket ACL', type: 'enum', description: 'Canned ACL for uploaded objects.', required: false, advanced: true, enumValues: [
        { label: 'Private', value: 'private' }, { label: 'Public Read', value: 'public-read' },
        { label: 'Public Read-Write', value: 'public-read-write' }, { label: 'Authenticated Read', value: 'authenticated-read' }
      ]},
      { name: 'storage_class', displayName: 'Storage Class', type: 'enum', description: 'Storage class for uploaded objects.', required: false, advanced: true, enumValues: [
        { label: 'Standard', value: '' }, { label: 'Standard-IA', value: 'STANDARD_IA' },
        { label: 'One Zone-IA', value: 'ONEZONE_IA' }, { label: 'Glacier', value: 'GLACIER' },
        { label: 'Deep Archive', value: 'DEEP_ARCHIVE' }, { label: 'Intelligent-Tiering', value: 'INTELLIGENT_TIERING' }
      ]},
      { name: 'server_side_encryption', displayName: 'Server Side Encryption', type: 'enum', description: 'Server-side encryption for uploaded objects.', required: false, advanced: true, enumValues: [
        { label: 'None', value: '' }, { label: 'AES256', value: 'AES256' }, { label: 'aws:kms', value: 'aws:kms' }
      ]},
      { name: 'sse_kms_key_id', displayName: 'SSE KMS Key ID', type: 'string', description: 'KMS key ID for server-side encryption.', required: false, advanced: true },
      { name: 'session_token', displayName: 'Session Token', type: 'string', description: 'Session token for temporary credentials.', required: false, advanced: true, sensitive: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for multipart uploads.', required: false, default: 4, advanced: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for multipart uploads.', required: false, default: '5Mi', advanced: true, placeholder: 'e.g. 5Mi' },
      { name: 'disable_checksum', displayName: 'Disable Checksum', type: 'bool', description: 'Disable checksum for multipart uploads.', required: false, default: false, advanced: true },
      { name: 'force_path_style', displayName: 'Force Path Style', type: 'bool', description: 'Force path style access for bucket operations.', required: false, default: false, advanced: true },
      { name: 'no_check_bucket', displayName: 'No Check Bucket', type: 'bool', description: 'Disable bucket existence check.', required: false, default: false, advanced: true },
      { name: 'leave_parts_on_error', displayName: 'Leave Parts On Error', type: 'bool', description: 'Leave incomplete multipart uploads on error.', required: false, default: false, advanced: true },
      { name: 'use_accelerate_endpoint', displayName: 'Use Accelerate Endpoint', type: 'bool', description: 'Use AWS Transfer Acceleration endpoint.', required: false, default: false, advanced: true },
      { name: 'directory_markers', displayName: 'Directory Markers', type: 'bool', description: 'Upload directory marker files.', required: false, default: false, advanced: true },
      { name: 'no_check_certificate', displayName: 'No Check Certificate', type: 'bool', description: 'Skip TLS certificate verification.', required: false, default: false, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['md5'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: true, serverSideMove: false }
  },
  {
    name: 'onedrive',
    displayName: 'Microsoft OneDrive',
    description: 'Microsoft OneDrive is a file hosting service operated by Microsoft.',
    category: 'Cloud Storage',
    tier: 'core',
    options: [
      { name: 'client_id', displayName: 'Client ID', type: 'string', description: 'OAuth Client Id.', required: false, advanced: true },
      { name: 'client_secret', displayName: 'Client Secret', type: 'string', description: 'OAuth Client Secret.', required: false, advanced: true, sensitive: true },
      { name: 'drive_type', displayName: 'Drive Type', type: 'enum', description: 'Type of drive to use.', required: false, default: 'auto', enumValues: [
        { label: 'Auto', value: 'auto' }, { label: 'Personal', value: 'personal' },
        { label: 'Business', value: 'business' }, { label: 'SharePoint', value: 'sharepoint' }
      ], advanced: false },
      { name: 'drive_id', displayName: 'Drive ID', type: 'string', description: 'The drive ID to use.', required: false, advanced: false },
      { name: 'root_folder', displayName: 'Root Folder', type: 'string', description: 'ID of the root folder.', required: false, advanced: false },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '10Mi', advanced: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true },
      { name: 'list_type', displayName: 'List Type', type: 'enum', description: 'List API version to use.', required: false, default: 'v2', enumValues: [
        { label: 'v2 (recommended)', value: 'v2' }, { label: 'v1 (deprecated)', value: 'v1' }
      ], advanced: true },
      { name: 'no_versions', displayName: 'No Versions', type: 'bool', description: 'Skip version checks.', required: false, default: false, advanced: true },
      { name: 'no_permissions', displayName: 'No Permissions', type: 'bool', description: 'Skip permission checks.', required: false, default: false, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    oauth: { required: true, scopes: ['Files.ReadWrite', 'offline_access'] },
    features: { hashTypes: ['quickxor'], readOnly: false, writeOnly: false, caseInsensitive: true, caseSensitive: false, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'dropbox',
    displayName: 'Dropbox',
    description: 'Dropbox is a file hosting service that offers cloud storage and file synchronization.',
    category: 'Cloud Storage',
    tier: 'core',
    options: [
      { name: 'client_id', displayName: 'Client ID', type: 'string', description: 'OAuth Client Id.', required: false, advanced: true },
      { name: 'client_secret', displayName: 'Client Secret', type: 'string', description: 'OAuth Client Secret.', required: false, advanced: true, sensitive: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '48M', advanced: true },
      { name: 'shared_files', displayName: 'Shared Files', type: 'bool', description: 'Enable access to shared files.', required: false, default: false, advanced: true },
      { name: 'shared_folders', displayName: 'Shared Folders', type: 'bool', description: 'Enable access to shared folders.', required: false, default: false, advanced: true },
      { name: 'impersonate', displayName: 'Impersonate', type: 'string', description: 'Impersonate a user (for team admins).', required: false, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    oauth: { required: true, scopes: [] },
    features: { hashTypes: ['dropbox'], readOnly: false, writeOnly: false, caseInsensitive: true, caseSensitive: false, duplicateFiles: false, serverSideCopy: false, serverSideMove: true }
  },
  {
    name: 'b2',
    displayName: 'Backblaze B2',
    description: 'Backblaze B2 Cloud Storage is an S3-compatible cloud storage service.',
    category: 'Cloud Storage',
    tier: 'core',
    options: [
      { name: 'account_id', displayName: 'Account ID', type: 'string', description: 'Account ID or Application Key ID.', required: true, advanced: false, sensitive: true },
      { name: 'account_key', displayName: 'Account Key', type: 'string', description: 'Application Key.', required: true, advanced: false, sensitive: true },
      { name: 'endpoint', displayName: 'Endpoint', type: 'string', description: 'Custom endpoint.', required: false, advanced: false },
      { name: 'bucket_id', displayName: 'Bucket ID', type: 'string', description: 'Bucket ID to use.', required: false, advanced: true },
      { name: 'hard_delete', displayName: 'Hard Delete', type: 'bool', description: 'Permanently delete files instead of hiding them.', required: false, default: false, advanced: false },
      { name: 'versions', displayName: 'Versions', type: 'bool', description: 'Show file versions.', required: false, default: false, advanced: true },
      { name: 'hide_deleted', displayName: 'Hide Deleted', type: 'bool', description: 'Hide deleted files in listings.', required: false, default: true, advanced: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '64M', advanced: true },
      { name: 'cut_off', displayName: 'Cut Off', type: 'string', description: 'Cutoff for switching from single to multipart upload.', required: false, default: '200M', advanced: true },
      { name: 'disable_check', displayName: 'Disable Check', type: 'bool', description: 'Disable check for file integrity.', required: false, default: false, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['sha1'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'box',
    displayName: 'Box',
    description: 'Box is a cloud content management and file sharing service.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'client_id', displayName: 'Client ID', type: 'string', description: 'OAuth Client Id.', required: false, advanced: true },
      { name: 'client_secret', displayName: 'Client Secret', type: 'string', description: 'OAuth Client Secret.', required: false, advanced: true, sensitive: true },
      { name: 'access_token', displayName: 'Access Token', type: 'string', description: 'OAuth Access Token.', required: false, advanced: true, sensitive: true },
      { name: 'enterprise_id', displayName: 'Enterprise ID', type: 'string', description: 'Enterprise ID for Box enterprise.', required: false, advanced: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '8M', advanced: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    oauth: { required: true, scopes: [] },
    features: { hashTypes: ['sha1'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'azureblob',
    displayName: 'Azure Blob Storage',
    description: "Azure Blob Storage is Microsoft's object storage solution for the cloud.",
    category: 'Cloud Storage',
    tier: 'core',
    options: [
      { name: 'account', displayName: 'Storage Account', type: 'string', description: 'Storage Account name.', required: true, advanced: false },
      { name: 'key', displayName: 'Storage Account Key', type: 'string', description: 'Storage Account Key.', required: false, advanced: false, sensitive: true },
      { name: 'sas_url', displayName: 'SAS URL', type: 'string', description: 'SAS URL for authentication.', required: false, advanced: false, sensitive: true },
      { name: 'tenant_id', displayName: 'Tenant ID', type: 'string', description: 'Tenant ID for service principal auth.', required: false, advanced: true },
      { name: 'client_id', displayName: 'Client ID', type: 'string', description: 'Client ID for service principal auth.', required: false, advanced: true },
      { name: 'client_secret', displayName: 'Client Secret', type: 'string', description: 'Client secret for service principal auth.', required: false, advanced: true, sensitive: true },
      { name: 'endpoint', displayName: 'Endpoint', type: 'string', description: 'Custom endpoint.', required: false, advanced: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '4M', advanced: true },
      { name: 'access_type', displayName: 'Access Type', type: 'enum', description: 'Access type for the service.', required: false, default: 'bearer', enumValues: [{ label: 'Bearer', value: 'bearer' }, { label: 'SAS', value: 'sas' }], advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['md5'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'pcloud',
    displayName: 'pCloud',
    description: 'pCloud is a cloud storage service based in Switzerland.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'client_id', displayName: 'Client ID', type: 'string', description: 'OAuth Client Id.', required: false, advanced: true },
      { name: 'client_secret', displayName: 'Client Secret', type: 'string', description: 'OAuth Client Secret.', required: false, advanced: true, sensitive: true },
      { name: 'hostname', displayName: 'Hostname', type: 'enum', description: 'Server hostname.', required: false, default: 'api.pcloud.com', enumValues: [
        { label: 'api.pcloud.com (EU)', value: 'api.pcloud.com' },
        { label: 'api-api.pcloud.com (US)', value: 'api-api.pcloud.com' }
      ], advanced: false },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    oauth: { required: true, scopes: [] },
    features: { hashTypes: ['sha1', 'sha256'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'mega',
    displayName: 'Mega',
    description: 'Mega.nz cloud storage service.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'user', displayName: 'Username', type: 'string', description: 'Mega.nz username (email).', required: true, advanced: false },
      { name: 'pass', displayName: 'Password', type: 'password', description: 'Mega.nz password.', required: true, advanced: false, sensitive: true },
      { name: 'hard_delete', displayName: 'Hard Delete', type: 'bool', description: 'Permanently delete files.', required: false, default: false, advanced: false },
      { name: 'debug', displayName: 'Debug', type: 'bool', description: 'Enable debug logging.', required: false, default: false, advanced: true }
    ],
    features: { hashTypes: ['crc32', 'ed2k', 'sha256'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'protondrive',
    displayName: 'Proton Drive',
    description: 'Proton Drive is a privacy-focused cloud storage service from Proton.',
    category: 'Cloud Storage',
    tier: 'experimental',
    options: [
      { name: 'username', displayName: 'Username', type: 'string', description: 'Proton Drive username.', required: true, advanced: false },
      { name: 'password', displayName: 'Password', type: 'password', description: 'Proton Drive password.', required: true, advanced: false, sensitive: true },
      { name: 'mail_only', displayName: 'Mail Only', type: 'bool', description: 'Only access mail.', required: false, default: false, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: [], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'gphotos',
    displayName: 'Google Photos',
    description: 'Google Photos is a photo sharing and storage service developed by Google.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'client_id', displayName: 'Client ID', type: 'string', description: 'OAuth Client Id.', required: false, advanced: true },
      { name: 'client_secret', displayName: 'Client Secret', type: 'string', description: 'OAuth Client Secret.', required: false, advanced: true, sensitive: true },
      { name: 'read_only', displayName: 'Read Only', type: 'bool', description: 'Set to true to disable write commands.', required: false, default: false, advanced: false },
      { name: 'start_year', displayName: 'Start Year', type: 'int', description: 'Albums older than this year will not be shown.', required: false, default: 2000, advanced: true },
      { name: 'include_archived', displayName: 'Include Archived', type: 'bool', description: 'Include albums that are marked as archived.', required: false, default: false, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    oauth: { required: true, scopes: ['https://www.googleapis.com/auth/photoslibrary'] },
    features: { hashTypes: [], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'jottacloud',
    displayName: 'Jottacloud',
    description: 'Jottacloud is a Norwegian cloud storage service.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'user', displayName: 'Username', type: 'string', description: 'User name.', required: false, advanced: false },
      { name: 'pass', displayName: 'Password', type: 'password', description: 'Password.', required: false, advanced: false, sensitive: true },
      { name: 'access_token', displayName: 'Access Token', type: 'string', description: 'Access token.', required: false, advanced: true, sensitive: true },
      { name: 'endpoint', displayName: 'Endpoint', type: 'enum', description: 'API endpoint to use.', required: false, default: 'https://api.jottacloud.com', enumValues: [
        { label: 'Jottacloud (api.jottacloud.com)', value: 'https://api.jottacloud.com' },
        { label: 'Telenor (backup.telenor.no)', value: 'https://backup.telenor.no' },
        { label: 'Synology (api.docs.yottamusic.com)', value: 'https://api.docs.yottamusic.com' }
      ], advanced: false },
      { name: 'hard_delete', displayName: 'Hard Delete', type: 'bool', description: 'Delete files permanently rather than moving to trash.', required: false, default: false, advanced: false },
      { name: 'trash_period', displayName: 'Trash Retention Period', type: 'int', description: 'Number of days to keep files in trash.', required: false, default: 30, advanced: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Number of concurrent uploads.', required: false, default: 4, advanced: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '8M', advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['md5'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'hidrive',
    displayName: 'HiDrive',
    description: 'HiDrive is a cloud storage service by Strato AG.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'user', displayName: 'Username', type: 'string', description: 'User name.', required: false, advanced: false },
      { name: 'pass', displayName: 'Password', type: 'password', description: 'Password.', required: false, advanced: false, sensitive: true },
      { name: 'access_token', displayName: 'Access Token', type: 'string', description: 'OAuth Access Token.', required: false, advanced: true, sensitive: true },
      { name: 'endpoint', displayName: 'Endpoint', type: 'string', description: 'API endpoint.', required: false, default: 'https://api.hidrive.strato.com', advanced: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '64M', advanced: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['md5'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'koofr',
    displayName: 'Koofr',
    description: 'Koofr is a cloud storage service based in Slovenia.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'user', displayName: 'Username', type: 'string', description: 'User name.', required: false, advanced: false },
      { name: 'pass', displayName: 'Password', type: 'password', description: 'Password.', required: false, advanced: false, sensitive: true },
      { name: 'access_token', displayName: 'Access Token', type: 'string', description: 'OAuth Access Token.', required: false, advanced: true, sensitive: true },
      { name: 'endpoint', displayName: 'Endpoint', type: 'string', description: 'API endpoint.', required: false, default: 'https://app.koofr.net', advanced: true },
      { name: 'root_folder_id', displayName: 'Root Folder ID', type: 'string', description: 'ID of the root folder.', required: false, advanced: false },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['md5'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'yandex',
    displayName: 'Yandex Disk',
    description: 'Yandex Disk is a cloud storage service by Yandex.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'client_id', displayName: 'Client ID', type: 'string', description: 'OAuth Client Id.', required: false, advanced: true },
      { name: 'client_secret', displayName: 'Client Secret', type: 'string', description: 'OAuth Client Secret.', required: false, advanced: true, sensitive: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '8M', advanced: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    oauth: { required: true, scopes: ['cloud_api:disk'] },
    features: { hashTypes: ['sha256'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'zoho',
    displayName: 'Zoho WorkDrive',
    description: 'Zoho WorkDrive is a cloud storage and collaboration platform.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'client_id', displayName: 'Client ID', type: 'string', description: 'OAuth Client Id.', required: false, advanced: true },
      { name: 'client_secret', displayName: 'Client Secret', type: 'string', description: 'OAuth Client Secret.', required: false, advanced: true, sensitive: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '64M', advanced: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    oauth: { required: true, scopes: ['WorkDrive.files.ALL', 'WorkDrive.teams.ALL'] },
    features: { hashTypes: [], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'mailru',
    displayName: 'Mail.ru Cloud',
    description: 'Mail.ru Cloud is a cloud storage service by Mail.ru.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'user', displayName: 'Username', type: 'string', description: 'User name (email).', required: false, advanced: false },
      { name: 'pass', displayName: 'Password', type: 'password', description: 'Password.', required: false, advanced: false, sensitive: true },
      { name: 'access_token', displayName: 'Access Token', type: 'string', description: 'OAuth Access Token.', required: false, advanced: true, sensitive: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '8M', advanced: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['sha256'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'sharefile',
    displayName: 'Citrix ShareFile',
    description: 'Citrix ShareFile is a secure enterprise file sync and share solution.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'client_id', displayName: 'Client ID', type: 'string', description: 'OAuth Client Id.', required: false, advanced: true },
      { name: 'client_secret', displayName: 'Client Secret', type: 'string', description: 'OAuth Client Secret.', required: false, advanced: true, sensitive: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '32M', advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    oauth: { required: true, scopes: [] },
    features: { hashTypes: ['sha256'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'sugarsync',
    displayName: 'SugarSync',
    description: 'SugarSync is a cloud-based file hosting and file synchronization service.',
    category: 'Cloud Storage',
    tier: 'supported',
    options: [
      { name: 'user', displayName: 'Username', type: 'string', description: 'User name (email).', required: false, advanced: false },
      { name: 'pass', displayName: 'Password', type: 'password', description: 'Password.', required: false, advanced: false, sensitive: true },
      { name: 'access_key_id', displayName: 'Access Key ID', type: 'string', description: 'Access Key ID.', required: false, advanced: false, sensitive: true },
      { name: 'private_access_key', displayName: 'Private Access Key', type: 'string', description: 'Private Access Key.', required: false, advanced: false, sensitive: true },
      { name: 'root_folder_id', displayName: 'Root Folder ID', type: 'string', description: 'ID of the root folder.', required: false, advanced: false },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['md5'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'fichier',
    displayName: '1Fichier',
    description: '1Fichier is a one-click file hosting service.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'api_key', displayName: 'API Key', type: 'string', description: 'API Key.', required: false, advanced: false, sensitive: true },
      { name: 'shared_folder', displayName: 'Shared Folder', type: 'string', description: 'Shared folder id.', required: false, advanced: false },
      { name: 'file_owner_api_key', displayName: 'File Owner API Key', type: 'string', description: 'File Owner API Key.', required: false, advanced: true, sensitive: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '50Mi', advanced: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: [], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'pixeldrain',
    displayName: 'Pixeldrain',
    description: 'Pixeldrain is a file sharing service with anonymous upload support.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'api_key', displayName: 'API Key', type: 'string', description: 'API Key for authenticated access.', required: false, advanced: false, sensitive: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '50M', advanced: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true }
    ],
    features: { hashTypes: ['md5'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'premiumize',
    displayName: 'Premiumize.me',
    description: 'Premiumize.me is a premium seedbox and cloud storage service.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'api_key', displayName: 'API Key', type: 'string', description: 'API Key.', required: false, advanced: false, sensitive: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: [], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'putio',
    displayName: 'put.io',
    description: 'put.io is a cloud storage and entertainment service.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'client_id', displayName: 'Client ID', type: 'string', description: 'OAuth Client Id.', required: false, advanced: true },
      { name: 'client_secret', displayName: 'Client Secret', type: 'string', description: 'OAuth Client Secret.', required: false, advanced: true, sensitive: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    oauth: { required: true, scopes: [] },
    features: { hashTypes: ['sha256'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'storj',
    displayName: 'Storj',
    description: 'Storj is a decentralized cloud storage network.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'provider', displayName: 'Provider', type: 'enum', description: 'Choose your Storj provider.', required: false, default: 'storj', enumValues: [
        { label: 'Storj (storj.io)', value: 'storj' }, { label: 'Wasabi (wasabi.com)', value: 'wasabi' }
      ], advanced: false },
      { name: 'access_grant', displayName: 'Access Grant', type: 'string', description: 'Access grant.', required: false, advanced: false, sensitive: true },
      { name: 'api_key', displayName: 'API Key', type: 'string', description: 'API Key.', required: false, advanced: false, sensitive: true },
      { name: 'passphrase', displayName: 'Passphrase', type: 'password', description: 'Encryption passphrase.', required: false, advanced: false, sensitive: true },
      { name: 'endpoint', displayName: 'Endpoint', type: 'string', description: 'Endpoint.', required: false, advanced: false, placeholder: 'e.g. gateway.storjshare.io' },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '64M', advanced: true },
      { name: 'no_check_certificate', displayName: 'No Check Certificate', type: 'bool', description: 'Skip TLS certificate verification.', required: false, default: false, advanced: true },
      { name: 'parallel_downloads', displayName: 'Parallel Downloads', type: 'int', description: 'Number of parallel downloads.', required: false, default: 4, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['crc32m'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: true, serverSideMove: false }
  },
  {
    name: 'internxt',
    displayName: 'Internxt',
    description: 'Internxt is a privacy-focused cloud storage service.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'user', displayName: 'Username', type: 'string', description: 'User name (email).', required: false, advanced: false },
      { name: 'pass', displayName: 'Password', type: 'password', description: 'Password.', required: false, advanced: false, sensitive: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['sha256'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'seafile',
    displayName: 'Seafile',
    description: 'Seafile is an open-source cloud storage platform.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'url', displayName: 'URL', type: 'string', description: 'URL of the Seafile server.', required: true, advanced: false, placeholder: 'https://cloud.example.com' },
      { name: 'user', displayName: 'Username', type: 'string', description: 'User name (email).', required: false, advanced: false },
      { name: 'pass', displayName: 'Password', type: 'password', description: 'Password.', required: false, advanced: false, sensitive: true },
      { name: 'library_key', displayName: 'Library Key', type: 'password', description: 'Library encryption key.', required: false, advanced: false, sensitive: true },
      { name: 'auth_token', displayName: 'Auth Token', type: 'string', description: 'Auth token (alternative to user/pass).', required: false, advanced: true, sensitive: true },
      { name: 'create_library', displayName: 'Create Library', type: 'bool', description: 'Create the library if it does not exist.', required: false, default: false, advanced: true },
      { name: 'two_factor', displayName: '2FA Code', type: 'string', description: 'Two-factor authentication code.', required: false, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['sha256'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'internetarchive',
    displayName: 'Internet Archive',
    description: 'The Internet Archive is a non-profit digital library with the mission of universal access to all knowledge.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'access_key_id', displayName: 'Access Key ID', type: 'string', description: 'IA Access Key ID.', required: false, advanced: false, sensitive: true },
      { name: 'secret_access_key', displayName: 'Secret Access Key', type: 'string', description: 'IA Secret Access Key.', required: false, advanced: false, sensitive: true },
      { name: 'endpoint', displayName: 'Endpoint', type: 'string', description: 'IA S3 endpoint.', required: false, default: 's3.us.archive.org', advanced: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '64M', advanced: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true },
      { name: 'no_check_certificate', displayName: 'No Check Certificate', type: 'bool', description: 'Skip TLS certificate verification.', required: false, default: false, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['md5', 'sha1', 'crc32'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'filen',
    displayName: 'Filen',
    description: 'Filen is a zero-knowledge encrypted cloud storage provider.',
    category: 'Cloud Storage',
    tier: 'experimental',
    options: [
      { name: 'user', displayName: 'Email', type: 'string', description: 'Filen email address.', required: false, advanced: false },
      { name: 'pass', displayName: 'Password', type: 'password', description: 'Filen password.', required: false, advanced: false, sensitive: true },
      { name: 'auth_token', displayName: 'Auth Token', type: 'string', description: 'Auth token (alternative).', required: false, advanced: true, sensitive: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['sha256'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NETWORK
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'sftp',
    displayName: 'SFTP',
    description: 'SSH File Transfer Protocol. Connect to remote servers over SSH.',
    category: 'Network',
    tier: 'core',
    options: [
      { name: 'host', displayName: 'Host', type: 'string', description: 'SSH host to connect to.', required: true, advanced: false, placeholder: 'e.g. example.com' },
      { name: 'port', displayName: 'Port', type: 'int', description: 'SSH port.', required: false, default: 22, advanced: false },
      { name: 'user', displayName: 'User', type: 'string', description: 'SSH username.', required: true, advanced: false },
      { name: 'pass', displayName: 'Password', type: 'password', description: 'SSH password.', required: false, advanced: false, sensitive: true },
      { name: 'key_file', displayName: 'Key File', type: 'string', description: 'Path to PEM private key file.', required: false, advanced: false },
      { name: 'key_file_passphrase', displayName: 'Key File Passphrase', type: 'password', description: 'Passphrase for the key file.', required: false, advanced: true, sensitive: true },
      { name: 'key_pem', displayName: 'Key PEM', type: 'string', description: 'PEM-encoded private key content.', required: false, advanced: true, sensitive: true },
      { name: 'known_hosts_command', displayName: 'Known Hosts Command', type: 'string', description: 'Command to get host key fingerprint.', required: false, advanced: true },
      { name: 'ssh', displayName: 'SSH Command', type: 'string', description: 'Custom SSH command.', required: false, advanced: true },
      { name: 'sftp_server_command', displayName: 'SFTP Server Command', type: 'string', description: 'Custom SFTP server command.', required: false, advanced: true },
      { name: 'overwrite', displayName: 'Overwrite', type: 'enum', description: 'Overwrite behavior.', required: false, default: 'true', enumValues: [
        { label: 'Always', value: 'true' }, { label: 'Never', value: 'false' },
        { label: 'Rename', value: 'rename' }, { label: 'Suffix', value: 'suffix' }
      ], advanced: false },
      { name: 'use_insecure_cipher', displayName: 'Use Insecure Cipher', type: 'bool', description: 'Allow insecure ciphers.', required: false, default: false, advanced: true },
      { name: 'disable_hashcheck', displayName: 'Disable Hash Check', type: 'bool', description: 'Disable post-transfer hash check.', required: false, default: false, advanced: true },
      { name: 'idle_timeout', displayName: 'Idle Timeout', type: 'string', description: 'Max time before closing idle connections.', required: false, default: '0', advanced: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Transfer chunk size.', required: false, default: '32K', advanced: true },
      { name: 'concurrency', displayName: 'Concurrency', type: 'int', description: 'Number of concurrent SFTP sessions.', required: false, default: 8, advanced: true },
      { name: 'set_env', displayName: 'Set Environment', type: 'string', description: 'Environment variables to set for SSH.', required: false, advanced: true },
      { name: 'command', displayName: 'Command', type: 'string', description: 'Remote shell command.', required: false, advanced: true },
      { name: 'protocol', displayName: 'Protocol', type: 'enum', description: 'SSH protocol version.', required: false, default: '0', enumValues: [
        { label: 'Auto', value: '0' }, { label: 'SSH-2', value: '2' }
      ], advanced: true },
      { name: 'bsd_lock', displayName: 'BSD Lock', type: 'bool', description: 'Use BSD file locking.', required: false, default: false, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true },
      { name: 'use_insecure_ssh', displayName: 'Use Insecure SSH', type: 'bool', description: 'Allow connecting to insecure servers.', required: false, default: false, advanced: true },
      { name: 'ciphers', displayName: 'Ciphers', type: 'string', description: 'Allowed ciphers (comma-separated).', required: false, advanced: true },
      { name: 'key_exchange', displayName: 'Key Exchange', type: 'string', description: 'Allowed key exchange algorithms.', required: false, advanced: true },
      { name: 'mac', displayName: 'MAC', type: 'string', description: 'Allowed MACs.', required: false, advanced: true }
    ],
    features: { hashTypes: ['md5', 'sha1'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'ftp',
    displayName: 'FTP',
    description: 'File Transfer Protocol. Connect to FTP servers.',
    category: 'Network',
    tier: 'core',
    options: [
      { name: 'host', displayName: 'Host', type: 'string', description: 'FTP host to connect to.', required: true, advanced: false },
      { name: 'port', displayName: 'Port', type: 'int', description: 'FTP port.', required: false, default: 21, advanced: false },
      { name: 'user', displayName: 'User', type: 'string', description: 'FTP username.', required: true, advanced: false },
      { name: 'pass', displayName: 'Password', type: 'password', description: 'FTP password.', required: true, advanced: false, sensitive: true },
      { name: 'explicit_tls', displayName: 'Explicit TLS (FTPS)', type: 'bool', description: 'Use explicit FTPS over TLS.', required: false, default: true, advanced: false },
      { name: 'concurrency', displayName: 'Concurrency', type: 'int', description: 'Max number of FTP connections.', required: false, default: 4, advanced: false },
      { name: 'no_check_certificate', displayName: 'No Check Certificate', type: 'bool', description: 'Skip TLS certificate verification.', required: false, default: false, advanced: true },
      { name: 'disable_mlsd', displayName: 'Disable MLSD', type: 'bool', description: 'Disable MLSD for directory listing.', required: false, default: false, advanced: true },
      { name: 'disable_epsv', displayName: 'Disable EPSV', type: 'bool', description: 'Disable Extended Passive mode.', required: false, default: false, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: [], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'webdav',
    displayName: 'WebDAV',
    description: 'Web Distributed Authoring and Versioning (WebDAV) protocol.',
    category: 'Network',
    tier: 'core',
    options: [
      { name: 'url', displayName: 'URL', type: 'string', description: 'URL of the WebDAV server.', required: true, advanced: false, placeholder: 'https://example.com/dav' },
      { name: 'vendor', displayName: 'Vendor', type: 'enum', description: 'WebDAV server vendor.', required: false, default: 'other', enumValues: [
        { label: 'Other', value: 'other' }, { label: 'Nextcloud', value: 'nextcloud' },
        { label: 'owncloud', value: 'owncloud' }, { label: 'Sharepoint', value: 'sharepoint' },
        { label: 'qnap', value: 'qnap' }, { label: 'Zotero', value: 'zotero' }
      ], advanced: false },
      { name: 'user', displayName: 'User', type: 'string', description: 'Username.', required: true, advanced: false },
      { name: 'pass', displayName: 'Password', type: 'password', description: 'Password.', required: true, advanced: false, sensitive: true },
      { name: 'bearer_token', displayName: 'Bearer Token', type: 'string', description: 'Bearer token for authentication.', required: false, advanced: true, sensitive: true },
      { name: 'encoder', displayName: 'Encoder', type: 'string', description: 'Encoder for file names.', required: false, advanced: true },
      { name: 'headers', displayName: 'Headers', type: 'string', description: 'Extra HTTP headers.', required: false, advanced: true },
      { name: 'other_connections', displayName: 'Other Connections', type: 'int', description: 'Max number of other connections.', required: false, default: 8, advanced: true },
      { name: 'tls', displayName: 'Use TLS', type: 'bool', description: 'Use HTTPS instead of plain HTTP.', required: false, default: true, advanced: false },
      { name: 'no_check_certificate', displayName: 'No Check Certificate', type: 'bool', description: 'Skip TLS certificate verification.', required: false, default: false, advanced: true }
    ],
    features: { hashTypes: ['sha1'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'http',
    displayName: 'HTTP',
    description: 'HTTP is a web protocol. Read files from an HTTP web server.',
    category: 'Network',
    tier: 'core',
    options: [
      { name: 'url', displayName: 'URL', type: 'string', description: 'URL of the HTTP server.', required: true, advanced: false, placeholder: 'https://example.com/files' },
      { name: 'no_head', displayName: 'No Head', type: 'bool', description: 'Disable HEAD requests.', required: false, default: false, advanced: true },
      { name: 'no_slash', displayName: 'No Slash', type: 'bool', description: 'Remove trailing slash from URL.', required: false, default: false, advanced: true },
      { name: 'no_check_certificate', displayName: 'No Check Certificate', type: 'bool', description: 'Skip TLS certificate verification.', required: false, default: false, advanced: true },
      { name: 'user', displayName: 'Username', type: 'string', description: 'Username.', required: false, advanced: false },
      { name: 'pass', displayName: 'Password', type: 'password', description: 'Password.', required: false, advanced: false, sensitive: true },
      { name: 'headers', displayName: 'Headers', type: 'string', description: 'Extra HTTP headers.', required: false, advanced: true }
    ],
    features: { hashTypes: [], readOnly: true, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTERPRISE / BIG DATA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'openstack',
    displayName: 'OpenStack Swift',
    description: 'OpenStack Swift is a distributed object storage system designed for high availability and scalability.',
    category: 'Enterprise',
    tier: 'core',
    options: [
      { name: 'env_auth', displayName: 'Env Auth', type: 'bool', description: 'Get credentials from environment variables (OS_AUTH_URL, etc.).', required: false, default: false, advanced: false },
      { name: 'user_name', displayName: 'User Name', type: 'string', description: 'User name to log in.', required: false, advanced: false },
      { name: 'user_domain', displayName: 'User Domain', type: 'string', description: 'User domain name.', required: false, advanced: false },
      { name: 'key', displayName: 'Key', type: 'password', description: 'API key or password.', required: false, advanced: false, sensitive: true },
      { name: 'auth', displayName: 'Auth URL', type: 'string', description: 'Authentication URL.', required: false, advanced: false, placeholder: 'https://auth.example.com/v3' },
      { name: 'user_id', displayName: 'User ID', type: 'string', description: 'User ID to log in.', required: false, advanced: true },
      { name: 'domain', displayName: 'Domain', type: 'string', description: 'Domain name.', required: false, advanced: true },
      { name: 'tenant_id', displayName: 'Tenant ID', type: 'string', description: 'Tenant ID (v2 auth).', required: false, advanced: true },
      { name: 'tenant_domain', displayName: 'Tenant Domain', type: 'string', description: 'Tenant domain (v3 auth).', required: false, advanced: true },
      { name: 'region', displayName: 'Region', type: 'string', description: 'Region to connect to.', required: false, advanced: false },
      { name: 'storage_url', displayName: 'Storage URL', type: 'string', description: 'Storage URL (override auto-detection).', required: false, advanced: true },
      { name: 'auth_token', displayName: 'Auth Token', type: 'string', description: 'Auth token (override auth).', required: false, advanced: true, sensitive: true },
      { name: 'endpoint_type', displayName: 'Endpoint Type', type: 'enum', description: 'Endpoint type.', required: false, default: 'public', enumValues: [
        { label: 'Public', value: 'public' }, { label: 'Internal', value: 'internal' }, { label: 'Admin', value: 'admin' }
      ], advanced: true },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Chunk size for uploads.', required: false, default: '5G', advanced: true },
      { name: 'no_chunk', displayName: 'No Chunk', type: 'bool', description: 'Upload files in one piece.', required: false, default: false, advanced: true },
      { name: 'no_check_certificate', displayName: 'No Check Certificate', type: 'bool', description: 'Skip TLS certificate verification.', required: false, default: false, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['md5'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: true, serverSideMove: true }
  },
  {
    name: 'hdfs',
    displayName: 'HDFS',
    description: 'Hadoop Distributed File System (HDFS).',
    category: 'Enterprise',
    tier: 'supported',
    options: [
      { name: 'namenode', displayName: 'Namenode', type: 'string', description: 'HDFS namenode service.', required: true, advanced: false, placeholder: 'e.g. hdfs://namenode:8020' },
      { name: 'user', displayName: 'User', type: 'string', description: 'HDFS user.', required: false, advanced: false },
      { name: 'token', displayName: 'Token', type: 'string', description: 'Kerberos delegation token.', required: false, advanced: true, sensitive: true },
      { name: 'token_renew_duration', displayName: 'Token Renew Duration', type: 'int', description: 'Token renew duration in seconds.', required: false, default: 3600, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['md5', 'crc32'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'netstorage',
    displayName: 'Akamai NetStorage',
    description: 'Akamai NetStorage is a cloud-based file storage service for content delivery.',
    category: 'Enterprise',
    tier: 'stable',
    options: [
      { name: 'host', displayName: 'Host', type: 'string', description: 'NetStorage host (CP code).', required: true, advanced: false, placeholder: 'e.g. 12345-hello.xfer.net' },
      { name: 'user', displayName: 'Username', type: 'string', description: 'NetStorage username.', required: true, advanced: false },
      { name: 'pass', displayName: 'Password', type: 'password', description: 'NetStorage password.', required: true, advanced: false, sensitive: true },
      { name: 'protocol', displayName: 'Protocol', type: 'enum', description: 'Protocol to use.', required: false, default: 'https', enumValues: [
        { label: 'HTTPS', value: 'https' }, { label: 'HTTP', value: 'http' }
      ], advanced: false },
      { name: 'no_check_certificate', displayName: 'No Check Certificate', type: 'bool', description: 'Skip TLS certificate verification.', required: false, default: false, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['md5'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'microsoftgrafx',
    displayName: 'Microsoft Grafx',
    description: 'Microsoft Grafx is a cloud storage service by Microsoft.',
    category: 'Cloud Storage',
    tier: 'stable',
    options: [
      { name: 'client_id', displayName: 'Client ID', type: 'string', description: 'OAuth Client Id.', required: false, advanced: true },
      { name: 'client_secret', displayName: 'Client Secret', type: 'string', description: 'OAuth Client Secret.', required: false, advanced: true, sensitive: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    oauth: { required: true, scopes: [] },
    features: { hashTypes: [], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WRAPPER / VIRTUAL BACKENDS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'crypt',
    displayName: 'Crypt (Encrypt)',
    description: 'Encrypt and decrypt another remote using industry-standard encryption.',
    category: 'Encryption',
    tier: 'core',
    options: [
      { name: 'remote', displayName: 'Remote', type: 'string', description: 'Remote to encrypt/decrypt (e.g. remote:path).', required: true, advanced: false, placeholder: 'remote:path' },
      { name: 'password', displayName: 'Password', type: 'password', description: 'Password for encryption.', required: true, advanced: false, sensitive: true },
      { name: 'password2', displayName: 'Password 2', type: 'password', description: 'Second password for additional security.', required: false, advanced: false, sensitive: true },
      { name: 'salt_encryption_name', displayName: 'Salt Encryption Name', type: 'bool', description: 'Use remote name as salt.', required: false, default: true, advanced: true },
      { name: 'salt_encoding', displayName: 'Salt Encoding', type: 'bool', description: 'Use salt for encoding.', required: false, default: true, advanced: true },
      { name: 'filename_encryption', displayName: 'Filename Encryption', type: 'enum', description: 'How to encrypt filenames.', required: false, default: 'standard', enumValues: [
        { label: 'Standard', value: 'standard' }, { label: 'Off', value: 'off' }, { label: 'Hash', value: 'hash' }
      ], advanced: false },
      { name: 'directory_name_encryption', displayName: 'Directory Name Encryption', type: 'bool', description: 'Encrypt directory names.', required: false, default: false, advanced: false }
    ],
    features: { hashTypes: [], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'alias',
    displayName: 'Alias',
    description: 'A simple alias to a path on another remote. Useful for organizing remotes.',
    category: 'Virtual',
    tier: 'core',
    options: [
      { name: 'remote', displayName: 'Remote', type: 'string', description: 'Remote path to alias (e.g. remote:path).', required: true, advanced: false, placeholder: 'remote:path' }
    ],
    features: { hashTypes: [], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'union',
    displayName: 'Union',
    description: 'Merge multiple remotes into a single directory tree.',
    category: 'Virtual',
    tier: 'core',
    options: [
      { name: 'remotes', displayName: 'Remotes', type: 'string', description: 'Semicolon-separated list of remotes.', required: true, advanced: false, placeholder: 'remote1:path1;remote2:path2' },
      { name: 'action_policy', displayName: 'Action Policy', type: 'enum', description: 'Policy for actions.', required: false, default: 'epall', enumValues: [
        { label: 'EPall (existing path, all)', value: 'epall' }, { label: 'EPROxy (existing path, proxy)', value: 'epproxy' },
        { label: 'FFAll (first found, all)', value: 'ffall' }, { label: 'FFProxy (first found, proxy)', value: 'ffproxy' },
        { label: 'LUR (least used, random)', value: 'lur' }, { label: 'MFS (most free space)', value: 'mfs' },
        { label: 'NC (newest category)', value: 'nc' }, { label: 'RC (random category)', value: 'rc' }
      ], advanced: false },
      { name: 'create_policy', displayName: 'Create Policy', type: 'enum', description: 'Policy for creating files.', required: false, default: 'mfs', enumValues: [
        { label: 'All', value: 'all' }, { label: 'Best effort', value: 'best' },
        { label: 'FF (first found)', value: 'ff' }, { label: 'LFS (least free space)', value: 'lfs' },
        { label: 'MFS (most free space)', value: 'mfs' }, { label: 'Newest', value: 'new' },
        { label: 'Random', value: 'rand' }
      ], advanced: false },
      { name: 'search_policy', displayName: 'Search Policy', type: 'enum', description: 'Policy for searching.', required: false, default: 'ff', enumValues: [
        { label: 'FF (first found)', value: 'ff' }, { label: 'LFS (least free space)', value: 'lfs' },
        { label: 'MFS (most free space)', value: 'mfs' }, { label: 'Newest', value: 'new' },
        { label: 'Random', value: 'rand' }
      ], advanced: false },
      { name: 'cache_time', displayName: 'Cache Time', type: 'string', description: 'Time to cache directory listings.', required: false, default: '3m', advanced: true },
      { name: 'min_space', displayName: 'Min Free Space', type: 'string', description: 'Minimum free space to keep on target.', required: false, advanced: true },
      { name: 'noprogress', displayName: 'No Progress', type: 'bool', description: "Don't show progress.", required: false, default: false, advanced: true },
      { name: 'read_all', displayName: 'Read All', type: 'bool', description: 'Read from all upstreams.', required: false, default: false, advanced: true }
    ],
    features: { hashTypes: [], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'chunker',
    displayName: 'Chunker',
    description: 'Transparently splits large files for storage on backends with size limits.',
    category: 'Virtual',
    tier: 'stable',
    options: [
      { name: 'remote', displayName: 'Remote', type: 'string', description: 'Remote to chunk (e.g. remote:path).', required: true, advanced: false },
      { name: 'chunk_size', displayName: 'Chunk Size', type: 'string', description: 'Size of each chunk.', required: false, default: '2G', advanced: false },
      { name: 'meta_format', displayName: 'Meta Format', type: 'enum', description: 'Metadata format.', required: false, default: 'json', enumValues: [
        { label: 'JSON', value: 'json' }, { label: 'Simple CSV', value: 'simplecsv' }
      ], advanced: true },
      { name: 'hash_type', displayName: 'Hash Type', type: 'enum', description: 'Hash algorithm for integrity.', required: false, default: 'sha1', enumValues: [
        { label: 'SHA1', value: 'sha1' }, { label: 'MD5', value: 'md5' },
        { label: 'Whirlpool', value: 'whirlpool' }, { label: 'CRC32', value: 'crc32' },
        { label: 'SHA256', value: 'sha256' }
      ], advanced: true },
      { name: 'metadata_upload', displayName: 'Metadata Upload', type: 'enum', description: 'When to upload metadata.', required: false, default: 'final', enumValues: [
        { label: 'Final', value: 'final' }, { label: 'Always', value: 'always' }
      ], advanced: true }
    ],
    features: { hashTypes: ['sha1'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'compress',
    displayName: 'Compress',
    description: 'Transparently gzip compress another remote.',
    category: 'Virtual',
    tier: 'stable',
    options: [
      { name: 'remote', displayName: 'Remote', type: 'string', description: 'Remote to compress (e.g. remote:path).', required: true, advanced: false },
      { name: 'mode', displayName: 'Mode', type: 'enum', description: 'Compression mode.', required: false, default: 'all', enumValues: [
        { label: 'All', value: 'all' }, { label: 'Newer', value: 'newer' }
      ], advanced: false },
      { name: 'level', displayName: 'Level', type: 'int', description: 'Compression level (1-9).', required: false, default: 6, advanced: true },
      { name: 'remap', displayName: 'Remap', type: 'string', description: 'Extensions to remap.', required: false, advanced: true },
      { name: 'no_compress_ext', displayName: 'No Compress Extensions', type: 'string', description: 'Extensions to not compress.', required: false, advanced: true }
    ],
    features: { hashTypes: [], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'hasher',
    displayName: 'Hasher',
    description: 'Add better checksum support to remotes that lack it.',
    category: 'Virtual',
    tier: 'stable',
    options: [
      { name: 'remote', displayName: 'Remote', type: 'string', description: 'Remote to add hash support to.', required: true, advanced: false },
      { name: 'max_age', displayName: 'Max Age', type: 'string', description: 'Maximum age of cached hash results.', required: false, default: '1w', advanced: false },
      { name: 'auto_delete', displayName: 'Auto Delete', type: 'bool', description: 'Auto-delete stale hash results.', required: false, default: false, advanced: true },
      { name: 'download', displayName: 'Download', type: 'bool', description: 'Download files to compute hashes.', required: false, default: false, advanced: true },
      { name: 'metadata_only', displayName: 'Metadata Only', type: 'bool', description: 'Store only metadata hashes.', required: false, default: false, advanced: true }
    ],
    features: { hashTypes: ['md5', 'sha1', 'sha256'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'combine',
    displayName: 'Combine',
    description: 'Combine multiple remotes into a single directory tree.',
    category: 'Virtual',
    tier: 'stable',
    options: [
      { name: 'root_remote', displayName: 'Root Remote', type: 'string', description: 'Root remote path.', required: true, advanced: false },
      { name: 'remote1', displayName: 'Remote 1', type: 'string', description: 'First remote to combine.', required: false, advanced: false },
      { name: 'remote2', displayName: 'Remote 2', type: 'string', description: 'Second remote to combine.', required: false, advanced: false },
      { name: 'remote3', displayName: 'Remote 3', type: 'string', description: 'Third remote to combine.', required: false, advanced: true }
    ],
    features: { hashTypes: [], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },
  {
    name: 'memory',
    displayName: 'In Memory',
    description: 'Store data in memory. Useful for testing and temporary storage.',
    category: 'Virtual',
    tier: 'supported',
    options: [
      { name: 'size', displayName: 'Size', type: 'string', description: 'Maximum size of the in-memory store.', required: false, default: '1G', advanced: false }
    ],
    features: { hashTypes: ['md5'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'imagekit',
    displayName: 'ImageKit',
    description: 'ImageKit is a real-time image and video optimization, transformation, and delivery service.',
    category: 'Media',
    tier: 'stable',
    options: [
      { name: 'endpoint', displayName: 'Endpoint', type: 'string', description: 'ImageKit endpoint URL.', required: true, advanced: false, placeholder: 'e.g. https://ik.imagekit.io/your_imagekit_id' },
      { name: 'public_key', displayName: 'Public Key', type: 'string', description: 'ImageKit public key.', required: false, advanced: false, sensitive: true },
      { name: 'private_key', displayName: 'Private Key', type: 'string', description: 'ImageKit private key.', required: false, advanced: false, sensitive: true },
      { name: 'upload_concurrency', displayName: 'Upload Concurrency', type: 'int', description: 'Concurrency for uploads.', required: false, default: 4, advanced: true },
      { name: 'encoding', displayName: 'Encoding', type: 'string', description: 'Encoding for file names.', required: false, advanced: true }
    ],
    features: { hashTypes: ['sha256'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'local',
    displayName: 'Local Disk',
    description: 'Access files on the local filesystem.',
    category: 'Local',
    tier: 'core',
    options: [
      { name: 'nounc', displayName: 'No UNC', type: 'bool', description: 'Disable UNC path expansion on Windows.', required: false, default: false, advanced: true },
      { name: 'copy_links', displayName: 'Copy Links', type: 'bool', description: 'Follow symlinks and copy the target.', required: false, default: false, advanced: false },
      { name: 'skip_links', displayName: 'Skip Links', type: 'bool', description: 'Skip symlinks.', required: false, default: false, advanced: false },
      { name: 'zero_size_links', displayName: 'Zero Size Links', type: 'bool', description: 'Report symlinks as zero size.', required: false, default: false, advanced: true },
      { name: 'no_unicode_normalization', displayName: 'No Unicode Normalization', type: 'bool', description: 'Disable unicode normalization.', required: false, default: false, advanced: true },
      { name: 'no_uppercase', displayName: 'No Uppercase', type: 'bool', description: 'Disable uppercase on Windows.', required: false, default: false, advanced: true },
      { name: 'case_sensitive', displayName: 'Case Sensitive', type: 'bool', description: 'Force case-sensitive mode.', required: false, default: false, advanced: true },
      { name: 'no_preallocate', displayName: 'No Preallocate', type: 'bool', description: 'Disable preallocation of disk space.', required: false, default: false, advanced: true },
      { name: 'no_sparse', displayName: 'No Sparse', type: 'bool', description: 'Disable sparse files.', required: false, default: false, advanced: true },
      { name: 'no_set_modtime', displayName: 'No Set ModTime', type: 'bool', description: 'Disable setting modification time.', required: false, default: false, advanced: true },
      { name: 'time_source', displayName: 'Time Source', type: 'enum', description: 'Source of time information.', required: false, default: 'off', enumValues: [
        { label: 'Off', value: 'off' }, { label: 'Server', value: 'server' }, { label: 'Client', value: 'client' }
      ], advanced: true }
    ],
    features: { hashTypes: ['md5', 'sha1'], readOnly: false, writeOnly: false, caseInsensitive: false, caseSensitive: true, duplicateFiles: false, serverSideCopy: false, serverSideMove: false }
  }
]
