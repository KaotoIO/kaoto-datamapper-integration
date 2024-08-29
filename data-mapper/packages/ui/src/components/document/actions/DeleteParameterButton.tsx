import { FunctionComponent, useCallback } from 'react';
import { Button, Modal, ModalVariant, Tooltip } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { useDataMapper, useToggle } from '../../../hooks';
import { MappingService } from '../../../services/mapping.service';

import { DocumentType } from '../../../models/path';
import { useCanvas } from '../../../hooks/useCanvas';

type DeleteParameterProps = {
  parameterName: string;
};

export const DeleteParameterButton: FunctionComponent<DeleteParameterProps> = ({ parameterName }) => {
  const { mappingTree, setMappingTree, sourceParameterMap, refreshSourceParameters } = useDataMapper();
  const { clearNodeReferencesForDocument, reloadNodeReferences } = useCanvas();
  const { state: isModalOpen, toggleOn: openModal, toggleOff: closeModal } = useToggle(false);

  const onConfirmDelete = useCallback(() => {
    const cleaned = MappingService.removeAllMappingsForDocument(mappingTree, DocumentType.PARAM, parameterName);
    setMappingTree(cleaned);
    sourceParameterMap.delete(parameterName);
    refreshSourceParameters();
    clearNodeReferencesForDocument(DocumentType.PARAM, parameterName);
    reloadNodeReferences();
    closeModal();
  }, [
    clearNodeReferencesForDocument,
    closeModal,
    mappingTree,
    parameterName,
    refreshSourceParameters,
    reloadNodeReferences,
    setMappingTree,
    sourceParameterMap,
  ]);

  return (
    <>
      <Tooltip position={'auto'} enableFlip={true} content={<div>Delete parameter</div>}>
        <Button
          variant="plain"
          aria-label="Delete parameter"
          data-testid={`delete-parameter-${parameterName}-button`}
          onClick={openModal}
        >
          <TrashIcon />
        </Button>
      </Tooltip>
      <Modal
        variant={ModalVariant.small}
        isOpen={isModalOpen}
        title="Delete parameter"
        data-testid="delete-parameter-modal"
        onClose={closeModal}
        actions={[
          <Button
            key="confirm"
            variant="primary"
            data-testid="delete-parameter-modal-confirm-btn"
            onClick={onConfirmDelete}
          >
            Confirm
          </Button>,
          <Button key="cancel" variant="link" data-testid="delete-parameter-modal-cancel-btn" onClick={closeModal}>
            Cancel
          </Button>,
        ]}
      >
        Delete parameter "{parameterName}"? Related mappings will be also removed.
      </Modal>
    </>
  );
};