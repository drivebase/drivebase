import { useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@drivebase/web/components/ui/button';
import { Input } from '@drivebase/web/components/ui/input';
import { CREATE_WORKSPACE } from '@drivebase/web/gql/mutations/workspace';

type StepOneProps = {
  onNext: (workspaceId: string) => void;
};

function StepOne({ onNext }: StepOneProps) {
  const { t } = useTranslation(['common', 'onboarding']);
  const nameRef = useRef<HTMLInputElement>(null);
  const [createWorkspace, { loading }] = useMutation(CREATE_WORKSPACE);

  function handleNext() {
    const name = nameRef.current?.value;
    if (name) {
      createWorkspace({ variables: { input: { name } } })
        .then((workspace) => {
          if (workspace.data) {
            onNext(workspace.data.createWorkspace.id);
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-sm text-muted-foreground"
      >
        <Input placeholder={t('onboarding:workspace_placeholder')} ref={nameRef} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Button className="px-10" variant={'outline'} onClick={handleNext} isLoading={loading}>
          {t('common:create')}
        </Button>
      </motion.div>
    </div>
  );
}

export default StepOne;
