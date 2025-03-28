import { ProviderFile } from '@drivebase/providers/provider.interface';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@drivebase/web/components/ui/tabs';
import {
  useListProviderFilesQuery,
  useUpdateProviderLabelMutation,
  useUpdateProviderMetadataMutation,
} from '@drivebase/web/lib/redux/endpoints/providers';
import { Provider } from '@prisma/client';
import {
  AlertCircle,
  CheckCircleIcon,
  EditIcon,
  FileIcon,
  FolderIcon,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import ProviderIcon from './provider.icon';

type ConfigureProviderProps = {
  provider: Provider;
};

function ConfigureProvider({ provider }: ConfigureProviderProps) {
  const [providerLabel, setProviderLabel] = useState(provider.label);
  const defaultPath =
    ((provider.metadata as Record<string, unknown>)
      ?.defaultUploadPath as string) || '/';
  const [currentPath, setCurrentPath] = useState('/');
  const [defaultUploadPath, setDefaultUploadPath] = useState(defaultPath);
  const [updateProviderMetadata, { isLoading: isUpdating }] =
    useUpdateProviderMetadataMutation();
  const [updateProviderLabel, { isLoading: isUpdatingLabel }] =
    useUpdateProviderLabelMutation();

  const { data: files, isLoading } = useListProviderFilesQuery({
    providerId: provider.id,
    path: currentPath,
  });

  useEffect(() => {
    if (files?.data) {
      console.log('Files loaded for path:', currentPath);
      console.log('Files data:', files.data);
      console.log(
        'Folders only:',
        files.data.filter((f) => f.isFolder),
      );
    }
  }, [files, currentPath]);

  const splitPath = currentPath.split('/').filter(Boolean);

  const handleFolderClick = (path: string) => {
    console.log('Folder clicked, raw path:', path);
    // Ensure proper path format based on whether it's already an absolute path
    const isAbsolutePath = path.startsWith('/');
    const newPath = isAbsolutePath
      ? path
      : `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${path}`;
    console.log('Setting new path:', newPath);
    setCurrentPath(newPath);
  };

  const getMetadataItems = () => {
    const metadata = (provider.metadata as Record<string, any>) || {};
    const userInfo = (metadata.userInfo || {}) as Record<string, string>;

    return Object.entries(userInfo).map(([key, value]) => (
      <div key={key} className="flex justify-between py-2 border-b">
        <span className="text-sm capitalize">
          {key.replace(/([A-Z])/g, ' $1').trim()}
        </span>
        <span className="text-muted-foreground">{String(value)}</span>
      </div>
    ));
  };

  const handleSetDefaultUploadPath = () => {
    updateProviderMetadata({
      providerId: provider.id,
      metadata: {
        defaultUploadPath: currentPath,
      },
    })
      .unwrap()
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
          providerId: provider.id,
          label: result.label,
        })
          .unwrap()
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
  }, [provider.id, providerLabel, updateProviderLabel]);

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
            <ProviderIcon provider={provider.type} className="w-6 h-6" />
            <div>
              <h3 className="font-medium">{providerLabel}</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {provider.type.replace('_', ' ').toLowerCase()}
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
            Navigate to the folder where you want files to be uploaded by
            default. You can change this at any time.
          </p>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">Current default:</span>{' '}
              {defaultUploadPath}
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
                <BreadcrumbLink onClick={() => setCurrentPath('/')}>
                  root
                </BreadcrumbLink>
              </BreadcrumbItem>
              {splitPath.length > 0 && <BreadcrumbSeparator />}
              {splitPath.map((path, index) => {
                // Build path incrementally
                const updatedPath =
                  '/' + splitPath.slice(0, index + 1).join('/');
                console.log(`Breadcrumb ${index}:`, {
                  segment: path,
                  fullPath: updatedPath,
                });

                return (
                  <Fragment key={path}>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        onClick={() => setCurrentPath(updatedPath)}
                      >
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

        {isLoading ? (
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
              {!files?.data?.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    No files found in this directory
                  </TableCell>
                </TableRow>
              ) : (
                files.data.map((file: ProviderFile) => (
                  <TableRow
                    key={file.id}
                    className={
                      file.isFolder ? 'cursor-pointer hover:bg-accent' : ''
                    }
                  >
                    <TableCell>
                      {file.isFolder ? (
                        <FolderIcon size={20} />
                      ) : (
                        <FileIcon size={20} />
                      )}
                    </TableCell>
                    <TableCell
                      onDoubleClick={() => {
                        if (file.isFolder) {
                          console.log('Navigating to path:', file.name);
                          handleFolderClick(file.name);
                        }
                      }}
                    >
                      {file.name}
                    </TableCell>
                    <TableCell>
                      {file.isFolder ? 'Folder' : file.type}
                    </TableCell>
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
            Disconnecting this provider will remove all access to its files.
            This action cannot be undone.
          </p>
          <Button variant="destructive">Disconnect Provider</Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default ConfigureProvider;
