import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@drivebase/react/components/button';
import { Input } from '@drivebase/react/components/input';
import { useCreateWorkspaceMutation } from '@drivebase/react/redux/endpoints/workspaces';
import { useTranslation } from 'react-i18next';

type StepOneProps = {
  onNext: (workspaceId: string) => void;
};

function StepOne({ onNext }: StepOneProps) {
  const { t } = useTranslation(['common', 'onboarding']);
  const nameRef = useRef<HTMLInputElement>(null);
  const [createWorkspace, { isLoading }] = useCreateWorkspaceMutation();

  const handleNext = async () => {
    const name = nameRef.current?.value;
    if (name) {
      createWorkspace({ name })
        .unwrap()
        .then((workspace) => {
          if (workspace.data) {
            onNext(workspace.data.id);
          }
        });
    }
  };

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-sm text-muted-foreground"
      >
        <Input
          placeholder={t('onboarding:workspace_placeholder')}
          ref={nameRef}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Button
          className="px-10"
          variant={'outline'}
          onClick={handleNext}
          isLoading={isLoading}
        >
          {t('common:create')}
        </Button>
      </motion.div>
    </div>
  );
}

export default StepOne;
