import { useMutation, useQuery } from '@apollo/client';
import { AlertCircle, CheckCircleIcon, EditIcon, FileIcon, FolderIcon } from 'lucide-react';
import { Fragment, useCallback, useState } from 'react';
import { toast } from 'sonner';

import { AuthType, ProviderType } from '@drivebase/sdk';
import { inputDialog } from '@drivebase/web/components/common/input.dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@drivebase/web/components/ui/breadcrumb';
import { Button } from '@drivebase/web/components/ui/button';
import { Skeleton } from '@drivebase/web/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@drivebase/web/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@drivebase/web/components/ui/tabs';
import { UPDATE_PROVIDER, UPDATE_PROVIDER_METADATA } from '@drivebase/web/gql/mutations/providers';
import { LIST_PROVIDER_FILES } from '@drivebase/web/gql/queries/providers';

import ProviderIcon from './provider.icon';

type ConfigureProviderProps = {
  id: string;
  name: string;
  type: ProviderType;
  authType: AuthType;
  metadata: Record<string, unknown>;
};

function ConfigureProvider({ id, name, type, metadata: providerMetadata }: ConfigureProviderProps) {
  const uploadPath = (providerMetadata?.uploadPath as string) || '/';

  const [providerLabel, setProviderLabel] = useState(name);
  const [currentPath, setCurrentPath] = useState(uploadPath);
  const [referenceId, setReferenceId] = useState<string | undefined>(
    (providerMetadata?.uploadReferenceId as string) || undefined,
  );
  const [defaultUploadPath, setDefaultUploadPath] = useState(uploadPath);

  const [updateProviderMetadata, { loading: isUpdating }] = useMutation(UPDATE_PROVIDER_METADATA);
  const [updateProviderLabel, { loading: isUpdatingLabel }] = useMutation(UPDATE_PROVIDER);

  const { data: files, loading } = useQuery(LIST_PROVIDER_FILES, {
    variables: {
      input: {
        id,
        path: currentPath,
        referenceId,
      },
    },
  });

  const splitPath = currentPath.split('/').filter(Boolean);

  const handleFolderClick = (path: string) => {
    // Ensure proper path format based on whether it's already an absolute path
    const isAbsolutePath = path.startsWith('/');
    const newPath = isAbsolutePath
      ? path
      : `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${path}`;

    setCurrentPath(newPath);
  };

  const getMetadataItems = () => {
    const metadata = (providerMetadata as Record<string, any>) || {};
    const userInfo = (metadata.userInfo || {}) as Record<string, string>;

    return Object.entries(userInfo).map(([key, value]) => (
      <div key={key} className="flex justify-between py-2 border-b">
        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
        <span className="text-muted-foreground">{String(value)}</span>
      </div>
    ));
  };

  const handleSetDefaultUploadPath = () => {
    updateProviderMetadata({
      variables: {
        input: {
          id,
          metadata: {
            uploadPath: currentPath,
            uploadReferenceId: referenceId,
          },
        },
      },
    })
      .then(() => {
        setDefaultUploadPath(currentPath);
        toast.success('Default upload location updated');
      })
      .catch((error) => {
        toast.error('Failed to update default upload location');
        console.error(error);
      });
  };

  const handleEditLabel = useCallback(() => {
    void (async () => {
      const result = await inputDialog({
        title: 'Edit Provider Label',
        description: 'Enter a new label for this provider',
        inputFields: [
          {
            name: 'label',
            label: 'Provider Label',
            defaultValue: providerLabel,
          },
        ],
      });

      if (result && result.label && result.label !== providerLabel) {
        updateProviderLabel({
          variables: {
            input: {
              id,
              name: result.label,
            },
          },
        })
          .then(() => {
            setProviderLabel(result.label);
            toast.success('Provider label updated');
          })
          .catch((error) => {
            toast.error('Failed to update provider label');
            console.error(error);
          });
      }
    })();
  }, [id, providerLabel, updateProviderLabel]);

  return (
    <Tabs defaultValue="tab-1">
      <TabsList className="h-auto w-full justify-start gap-2 rounded-none border-b border-border bg-transparent px-0 py-1 text-foreground">
        <TabsTrigger
          value="information"
          className="relative after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-foreground data-[state=active]:hover:bg-accent"
        >
          Information
        </TabsTrigger>
        <TabsTrigger
          value="destination"
          className="relative after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-foreground data-[state=active]:hover:bg-accent"
        >
          Upload Folder
        </TabsTrigger>
        <TabsTrigger
          value="danger"
          className="relative after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-foreground data-[state=active]:hover:bg-accent"
        >
          Danger
        </TabsTrigger>
      </TabsList>
      <TabsContent value="information" className="space-y-4 pt-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <ProviderIcon provider={type} className="w-6 h-6" />
            <div>
              <h3 className="font-medium">{name}</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {type.replace('_', ' ').toLowerCase()}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleEditLabel}
            disabled={isUpdatingLabel}
            className="flex items-center gap-1"
          >
            <EditIcon size={16} />
            Edit Label
          </Button>
        </div>
        {getMetadataItems()}
      </TabsContent>

      <TabsContent value="destination" className="space-y-4 pt-4">
        <div className="border rounded-md p-4 bg-muted/30 mb-4">
          <h3 className="font-medium mb-2">Default Upload Location</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Navigate to the folder where you want files to be uploaded by default. You can change
            this at any time.
          </p>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">Current default:</span> {defaultUploadPath}
            </div>
            <Button
              size="sm"
              onClick={() => handleSetDefaultUploadPath()}
              disabled={currentPath === defaultUploadPath || isUpdating}
              className="flex items-center gap-1"
            >
              {isUpdating ? (
                'Updating...'
              ) : (
                <>
                  <CheckCircleIcon size={16} />
                  Set Current Folder as Default
                </>
              )}
            </Button>
          </div>
        </div>

        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => {
                    setCurrentPath('/');
                    setReferenceId('');
                  }}
                >
                  root
                </BreadcrumbLink>
              </BreadcrumbItem>
              {splitPath.length > 0 && <BreadcrumbSeparator />}
              {splitPath.map((path, index) => {
                // Build path incrementally
                const updatedPath = '/' + splitPath.slice(0, index + 1).join('/');

                return (
                  <Fragment key={path}>
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={() => setCurrentPath(updatedPath)}>
                        {path}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {index !== splitPath.length - 1 && <BreadcrumbSeparator />}
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!files?.listProviderFiles.data?.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    No files found in this directory
                  </TableCell>
                </TableRow>
              ) : (
                files.listProviderFiles.data.map((file) => (
                  <TableRow
                    key={file.id}
                    className={file.isFolder ? 'cursor-pointer hover:bg-accent' : ''}
                  >
                    <TableCell>
                      {file.isFolder ? <FolderIcon size={20} /> : <FileIcon size={20} />}
                    </TableCell>
                    <TableCell
                      onDoubleClick={() => {
                        if (file.isFolder) {
                          handleFolderClick(file.name);
                          if (file.id && file.id !== file.path) {
                            setReferenceId(file.id);
                          }
                        }
                      }}
                    >
                      {file.name}
                    </TableCell>
                    <TableCell>{file.isFolder ? 'Folder' : 'File'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </TabsContent>

      <TabsContent value="danger" className="space-y-4 pt-4">
        <div className="border border-destructive/20 rounded-md p-4 bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle size={20} />
            <h3 className="font-semibold">Danger Zone</h3>
          </div>
          <p className="text-sm mb-4">
            Disconnecting this provider will remove all access to its files. This action cannot be
            undone.
          </p>
          <Button variant="destructive">Disconnect Provider</Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default ConfigureProvider;
