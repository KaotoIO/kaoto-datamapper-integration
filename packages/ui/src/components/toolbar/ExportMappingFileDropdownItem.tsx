import { Button, DropdownItem, Modal } from '@patternfly/react-core';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';
import { ExportIcon } from '@patternfly/react-icons';
import { MappingSerializerService } from '../../services/mapping-serializer.service';
import { useDataMapper } from '../../hooks';
import { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import IStandaloneEditorConstructionOptions = editor.IStandaloneEditorConstructionOptions;

export const ExportMappingFileDropdownItem: FunctionComponent<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const { mappings, sourceParameterMap } = useDataMapper();
  const [isModalOpen, setIsModalOpen] = useState<boolean>();
  const [serializedMappings, setSerializedMappings] = useState<string>();

  const handleMenuClick = useCallback(() => {
    const serialized = MappingSerializerService.serialize(mappings, sourceParameterMap);
    setSerializedMappings(serialized);
    setIsModalOpen(true);
  }, [mappings, sourceParameterMap]);

  const handleModalClose = useCallback(() => {
    setSerializedMappings('');
    setIsModalOpen(false);
    onComplete();
  }, [onComplete]);

  const onEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editor.layout();
    editor.focus();
    monaco.editor.getModels()[0].updateOptions({ tabSize: 2 });
  }, []);

  const modalActions = useMemo(() => {
    return [
      <Button key="Close" variant="primary" onClick={handleModalClose}>
        Close
      </Button>,
    ];
  }, [handleModalClose]);

  const editorOptions: IStandaloneEditorConstructionOptions = useMemo(() => {
    return { wordWrap: 'on' };
  }, []);

  return (
    <>
      <DropdownItem icon={<ExportIcon />} onClick={handleMenuClick} data-testid="export-mappings-button">
        Export the current mappings (.xsl)
      </DropdownItem>
      <Modal
        variant="large"
        title="Exported Mappings"
        isOpen={isModalOpen}
        onClose={() => handleModalClose()}
        actions={modalActions}
      >
        <CodeEditor
          isReadOnly={false}
          isDownloadEnabled={true}
          code={serializedMappings}
          language={Language.xml}
          onEditorDidMount={onEditorDidMount}
          height="sizeToFit"
          width="sizeToFit"
          options={editorOptions}
        />
      </Modal>
    </>
  );
};
