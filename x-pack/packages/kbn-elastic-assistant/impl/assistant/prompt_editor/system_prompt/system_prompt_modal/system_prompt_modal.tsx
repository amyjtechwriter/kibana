/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiTextArea,
  EuiCheckbox,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { Conversation, Prompt } from '../../../../..';
import * as i18n from './translations';
import { useAssistantContext } from '../../../../assistant_context';
import { ConversationMultiSelector } from './conversation_multi_selector/conversation_multi_selector';
import {
  SYSTEM_PROMPT_SELECTOR_CLASSNAME,
  SystemPromptSelector,
} from './system_prompt_selector/system_prompt_selector';

const StyledEuiModal = styled(EuiModal)`
  min-width: 400px;
  max-width: 400px;
  max-height: 80vh;
`;

interface Props {
  systemPrompts: Prompt[];
  onClose: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>
  ) => void;
  onSystemPromptsChange: (systemPrompts: Prompt[]) => void;
}

/**
 * Modal for adding/removing system prompts. Configure name, prompt and default conversations.
 */
export const SystemPromptModal: React.FC<Props> = React.memo(
  ({ systemPrompts, onClose, onSystemPromptsChange }) => {
    const { conversations } = useAssistantContext();
    // Local state for quick prompts (returned to parent on save via onSystemPromptsChange())
    const [updatedSystemPrompts, setUpdatedSystemPrompts] = useState<Prompt[]>(systemPrompts);

    // Form options
    const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<Prompt>();
    // Prompt
    const [prompt, setPrompt] = useState('');
    const handlePromptTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
    }, []);
    // Conversations this system prompt should be a default for
    const [selectedConversations, setSelectedConversations] = useState<Conversation[]>([]);
    const onConversationSelectionChange = useCallback((newConversations: Conversation[]) => {
      setSelectedConversations(newConversations);
    }, []);
    // Whether this system prompt should be the default for new conversations
    const [isNewConversationDefault, setIsNewConversationDefault] = useState(false);
    const handleNewConversationDefaultChange = useCallback(
      (e) => {
        setIsNewConversationDefault(e.target.checked);
        if (selectedSystemPrompt != null) {
          setUpdatedSystemPrompts((prev) => {
            return prev.map((pp) => ({
              ...pp,
              isNewConversationDefault: selectedSystemPrompt.id === pp.id && e.target.checked,
            }));
          });
          setSelectedSystemPrompt((prev) =>
            prev != null ? { ...prev, isNewConversationDefault: e.target.checked } : prev
          );
        }
      },
      [selectedSystemPrompt]
    );

    // When top level system prompt selection changes
    const onSystemPromptSelectionChange = useCallback(
      (systemPrompt?: Prompt | string) => {
        const newPrompt: Prompt | undefined =
          typeof systemPrompt === 'string'
            ? {
                id: systemPrompt ?? '',
                content: '',
                name: systemPrompt ?? '',
                promptType: 'system',
              }
            : systemPrompt;

        setSelectedSystemPrompt(newPrompt);
        setPrompt(newPrompt?.content ?? '');
        setIsNewConversationDefault(newPrompt?.isNewConversationDefault ?? false);
        // Find all conversations that have this system prompt as a default
        setSelectedConversations(
          newPrompt != null
            ? Object.values(conversations).filter(
                (conversation) => conversation?.apiConfig.defaultSystemPrompt?.id === newPrompt?.id
              )
            : []
        );
      },
      [conversations]
    );

    const onSystemPromptDeleted = useCallback((id: string) => {
      setUpdatedSystemPrompts((prev) => prev.filter((sp) => sp.id !== id));
    }, []);

    const handleSave = useCallback(() => {
      onSystemPromptsChange(updatedSystemPrompts);
    }, [onSystemPromptsChange, updatedSystemPrompts]);

    // useEffects
    // Update system prompts on any field change since editing is in place
    useEffect(() => {
      if (selectedSystemPrompt != null) {
        setUpdatedSystemPrompts((prev) => {
          const alreadyExists = prev.some((sp) => sp.id === selectedSystemPrompt.id);
          if (alreadyExists) {
            return prev.map((sp) => {
              if (sp.id === selectedSystemPrompt.id) {
                return {
                  ...sp,
                  content: prompt,
                  promptType: 'system',
                };
              }
              return sp;
            });
          } else {
            return [
              ...prev,
              {
                ...selectedSystemPrompt,
                content: prompt,
                promptType: 'system',
              },
            ];
          }
        });
      }
    }, [prompt, selectedSystemPrompt]);

    return (
      <StyledEuiModal onClose={onClose} initialFocus={`.${SYSTEM_PROMPT_SELECTOR_CLASSNAME}`}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.ADD_SYSTEM_PROMPT_MODAL_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFormRow label={i18n.SYSTEM_PROMPT_NAME}>
            <SystemPromptSelector
              onSystemPromptDeleted={onSystemPromptDeleted}
              onSystemPromptSelectionChange={onSystemPromptSelectionChange}
              systemPrompts={updatedSystemPrompts}
              selectedSystemPrompt={selectedSystemPrompt}
            />
          </EuiFormRow>

          <EuiFormRow label={i18n.SYSTEM_PROMPT_PROMPT}>
            <EuiTextArea onChange={handlePromptTextChange} value={prompt} />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.SYSTEM_PROMPT_DEFAULT_CONVERSATIONS}
            helpText={i18n.SYSTEM_PROMPT_DEFAULT_CONVERSATIONS_HELP_TEXT}
          >
            <ConversationMultiSelector
              onConversationSelectionChange={onConversationSelectionChange}
              conversations={Object.values(conversations)}
              selectedConversations={selectedConversations}
            />
          </EuiFormRow>
          <EuiFormRow>
            <EuiCheckbox
              id={'defaultNewConversation'}
              label={
                <EuiFlexGroup alignItems="center" gutterSize={'xs'}>
                  <EuiFlexItem>{i18n.SYSTEM_PROMPT_DEFAULT_NEW_CONVERSATION}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={isNewConversationDefault ? 'starFilled' : 'starEmpty'} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              checked={isNewConversationDefault}
              onChange={handleNewConversationDefaultChange}
              compressed
            />
          </EuiFormRow>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose}>{i18n.CANCEL}</EuiButtonEmpty>

          <EuiButton type="submit" onClick={handleSave} fill>
            {i18n.SAVE}
          </EuiButton>
        </EuiModalFooter>
      </StyledEuiModal>
    );
  }
);

SystemPromptModal.displayName = 'SystemPromptModal';
