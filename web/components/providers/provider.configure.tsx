import { ProviderFile } from '@drivebase/providers/provider.interface';
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
import { useListProviderFilesQuery } from '@drivebase/web/lib/redux/endpoints/providers';
import { Provider } from '@prisma/client';
import { AlertCircle, FileIcon, FolderIcon } from 'lucide-react';
import { useState } from 'react';
import { Fragment } from 'react';

import ProviderIcon from './provider.icon';

type ConfigureProviderProps = {
  provider: Provider;
};

function ConfigureProvider({ provider }: ConfigureProviderProps) {
  const [currentPath, setCurrentPath] = useState('/');

  const { data: files, isLoading } = useListProviderFilesQuery({
    providerId: provider.id,
    path: currentPath,
  });

  const splitPath = currentPath.split('/').filter(Boolean);

  const handleFolderClick = (path: string) => {
    setCurrentPath(path);
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

  return (
    <Tabs defaultValue="information" className="w-full">
      <TabsList className="grid grid-cols-3">
        <TabsTrigger value="information">Information</TabsTrigger>
        <TabsTrigger value="destination">Destination</TabsTrigger>
        <TabsTrigger value="danger">Danger</TabsTrigger>
      </TabsList>

      <TabsContent value="information" className="space-y-4 pt-4">
        <div className="flex items-center gap-4 mb-4">
          <ProviderIcon provider={provider.type} className="w-6 h-6" />
          <div>
            <h3 className="font-medium">{provider.label}</h3>
            <p className="text-sm text-muted-foreground capitalize">
              {provider.type.replace('_', ' ').toLowerCase()}
            </p>
          </div>
        </div>
        {getMetadataItems()}
      </TabsContent>

      <TabsContent value="destination" className="space-y-4 pt-4">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => setCurrentPath('/')}>
                  root
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {splitPath.map((path, index) => {
                const updatedPath =
                  '/' + splitPath.slice(0, index + 1).join('/');

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
                      onDoubleClick={() =>
                        file.isFolder && handleFolderClick(file.path || file.id)
                      }
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
