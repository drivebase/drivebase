import { useApolloClient, useMutation } from '@apollo/client';
import { useSearch } from '@tanstack/react-router';
import { FolderIcon, PlusIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@drivebase/web/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@drivebase/web/components/ui/dialog';
import { Input } from '@drivebase/web/components/ui/input';
import { CREATE_FOLDER } from '@drivebase/web/gql/mutations/files';
import { GET_FILES } from '@drivebase/web/gql/queries/files';

function NewFolderDialog() {
  const client = useApolloClient();
  const { t } = useTranslation(['common', 'dashboard']);

  const search = useSearch({ from: '/_protected/_dashboard/' });
  const ref = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const parentPath = search.path;

  const [createFolder, { loading }] = useMutation(CREATE_FOLDER);

  const handleCreate = () => {
    const name = ref.current?.value;

    if (!name) {
      toast.error('Please enter a name');
      ref.current?.focus();
      return;
    }

    createFolder({
      variables: {
        input: {
          name,
          parentPath: parentPath ?? '/',
        },
      },
    })
      .then(() => {
        toast.success('Folder created');
        setIsOpen(false);

        client.refetchQueries({ include: [GET_FILES] }).catch((err) => {
          console.error(err);
        });
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to create folder');
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={'outline'}>
          <PlusIcon className="w-4 h-4" />
          {t('dashboard:new_folder')}
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 w-96 gap-0">
        <DialogHeader className="px-8 py-10">
          <DialogTitle asChild className="mx-auto text-2xl select-none text-center">
            <div>
              <FolderIcon size={75} className="mx-auto mb-4 p-4 bg-muted rounded-xl" />
              <h1 className="text-2xl font-medium">{t('dashboard:new_folder')}</h1>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="py-10 px-8 bg-accent/30 border-t">
          <Input
            placeholder={t('dashboard:new_folder_placeholder')}
            className="w-full"
            ref={ref}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreate();
              }
            }}
          />
          <Button
            variant={'outline'}
            className="w-full mt-4"
            onClick={handleCreate}
            isLoading={loading}
          >
            {t('common:create')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewFolderDialog;
