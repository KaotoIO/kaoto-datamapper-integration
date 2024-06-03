import { forwardRef, FunctionComponent, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  ActionList,
  ActionListItem,
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { GripVerticalIcon } from '@patternfly/react-icons';
import { DocumentType, IDocument, PrimitiveDocument } from '../../../models/document';
import { TargetDocumentField } from './TargetDocumentField';
import { useCanvas } from '../../../hooks/useCanvas';
import { AttachSchemaButton } from '../AttachSchemaButton';
import { DetachSchemaButton } from '../DetachSchemaButton';
import { NodeContainer } from '../NodeContainer';
import { NodeReference } from '../../../providers/CanvasProvider';
import '../Document.scss';

export type TargetDocumentProps = {
  model: IDocument;
};

type TargetDocumentImplProps = TargetDocumentProps & {
  nodeId: string;
};

const TargetPrimitiveDocumentImpl = forwardRef<NodeReference, TargetDocumentImplProps>(
  ({ model, nodeId }, forwardedRef) => {
    const ref = useRef<HTMLDivElement>(null);
    useImperativeHandle(forwardedRef, () => ({
      get headerRef() {
        return ref.current;
      },
      get containerRef() {
        return ref.current;
      },
    }));

    const headerActiopns = useMemo(() => {
      return (
        <ActionList isIconList={true}>
          <ActionListItem>
            <AttachSchemaButton
              documentType={DocumentType.TARGET_BODY}
              documentId={model.documentId}
            ></AttachSchemaButton>
          </ActionListItem>
        </ActionList>
      );
    }, [model.documentId]);

    return (
      <Card id={nodeId} isCompact>
        <NodeContainer dndId={nodeId} field={model as PrimitiveDocument} ref={ref}>
          <CardHeader actions={{ actions: headerActiopns, hasNoOffset: true }}>
            <CardTitle>
              <Split hasGutter>
                <SplitItem>
                  <GripVerticalIcon />
                </SplitItem>
                <SplitItem>{model.name}</SplitItem>
              </Split>
            </CardTitle>
          </CardHeader>
        </NodeContainer>
      </Card>
    );
  },
);

const TargetStructuredDocumentImpl = forwardRef<NodeReference, TargetDocumentImplProps>(
  ({ model, nodeId }, forwardedRef) => {
    const { reloadNodeReferences } = useCanvas();
    const [isExpanded, setExpanded] = useState<boolean>(true);

    const handleOnToggle = useCallback(() => {
      reloadNodeReferences();
    }, [reloadNodeReferences]);
    const handleOnExpand = useCallback(() => {
      setExpanded(!isExpanded);
      reloadNodeReferences();
    }, [isExpanded, reloadNodeReferences]);

    const headerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(forwardedRef, () => ({
      get headerRef() {
        return headerRef.current;
      },
      get containerRef() {
        return headerRef.current;
      },
    }));

    const headerActions = useMemo(() => {
      return (
        <ActionList isIconList={true}>
          <ActionListItem>
            <AttachSchemaButton
              documentType={DocumentType.TARGET_BODY}
              documentId={model.documentId}
              hasSchema={true}
            ></AttachSchemaButton>
          </ActionListItem>
          <ActionListItem>
            <DetachSchemaButton
              documentType={DocumentType.TARGET_BODY}
              documentId={model.documentId}
            ></DetachSchemaButton>
          </ActionListItem>
        </ActionList>
      );
    }, [model]);

    return (
      <Card id={nodeId} isExpanded={isExpanded} isCompact>
        <NodeContainer ref={headerRef}>
          <CardHeader onExpand={handleOnExpand} actions={{ actions: headerActions, hasNoOffset: true }}>
            <CardTitle>{model.name}</CardTitle>
          </CardHeader>
        </NodeContainer>
        <CardExpandableContent>
          <CardBody>
            <Accordion togglePosition={'start'} isBordered={true} asDefinitionList={false} onClick={handleOnToggle}>
              {model.fields.map((field) => (
                <TargetDocumentField field={field} key={field.name} onToggle={handleOnToggle} />
              ))}
            </Accordion>
          </CardBody>
        </CardExpandableContent>
      </Card>
    );
  },
);

export const TargetDocument: FunctionComponent<TargetDocumentProps> = ({ model }) => {
  const { getNodeReference, setNodeReference } = useCanvas();
  const nodeReference = useRef<NodeReference>({ headerRef: null, containerRef: null });
  const fieldRefId = model.fieldIdentifier.toString();
  getNodeReference(fieldRefId) !== nodeReference && setNodeReference(fieldRefId, nodeReference);

  const nodeId = useMemo(() => model.documentId + '-' + Math.floor(Math.random() * 10000), [model.documentId]);

  return model instanceof PrimitiveDocument ? (
    <TargetPrimitiveDocumentImpl model={model} nodeId={nodeId} ref={nodeReference} />
  ) : (
    <TargetStructuredDocumentImpl model={model} nodeId={nodeId} ref={nodeReference} />
  );
};
