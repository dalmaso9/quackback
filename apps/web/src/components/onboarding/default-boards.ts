import {
  LightBulbIcon,
  BugAntIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  PuzzlePieceIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid'
import type { ComponentType } from 'react'
import type { UseCaseType } from '@/lib/shared/db-types'

export interface DefaultBoardOption {
  id: string
  name: string
  description: string
  icon: ComponentType<{ className?: string }>
  /** Use cases where this board should be pre-selected */
  useCases: UseCaseType[]
}

/**
 * Default board templates for onboarding.
 * Users can toggle these on/off during setup.
 * Boards are personalized based on the selected use case.
 */
export const DEFAULT_BOARD_OPTIONS: DefaultBoardOption[] = [
  // Common boards (most use cases)
  {
    id: 'feature-requests',
    name: 'Solicitações de funcionalidades',
    description: 'Colete ideias e sugestões para novas funcionalidades',
    icon: LightBulbIcon,
    useCases: ['saas', 'consumer', 'marketplace'],
  },
  {
    id: 'bug-reports',
    name: 'Relatos de bugs',
    description: 'Acompanhe problemas e falhas reportados pelos usuários',
    icon: BugAntIcon,
    useCases: ['saas', 'consumer', 'marketplace'],
  },
  // SaaS-specific
  {
    id: 'integrations',
    name: 'Integrações',
    description: 'Pedidos de novas integrações e conexões',
    icon: PuzzlePieceIcon,
    useCases: ['saas'],
  },
  // Consumer-specific
  {
    id: 'ux-feedback',
    name: 'Feedback de UX',
    description: 'Feedback sobre usabilidade e experiência do usuário',
    icon: SparklesIcon,
    useCases: ['consumer'],
  },
  // Platform-specific
  {
    id: 'seller-feedback',
    name: 'Feedback de vendedores',
    description: 'Feedback de vendedores e parceiros',
    icon: BuildingStorefrontIcon,
    useCases: ['marketplace'],
  },
  {
    id: 'buyer-feedback',
    name: 'Feedback de compradores',
    description: 'Feedback de compradores e clientes',
    icon: UserGroupIcon,
    useCases: ['marketplace'],
  },
  // Internal-specific
  {
    id: 'product-ideas',
    name: 'Ideias de produto',
    description: 'Ideias para novos produtos ou funcionalidades',
    icon: LightBulbIcon,
    useCases: ['internal'],
  },
  {
    id: 'process-improvements',
    name: 'Melhorias de processo',
    description: 'Sugestões para melhorar fluxos e processos',
    icon: WrenchScrewdriverIcon,
    useCases: ['internal'],
  },
  {
    id: 'general-feedback',
    name: 'Feedback geral',
    description: 'Feedback aberto para qualquer assunto',
    icon: ChatBubbleOvalLeftEllipsisIcon,
    useCases: ['internal'],
  },
]

/**
 * Get board IDs that should be pre-selected for a given use case.
 * Falls back to feature requests and bug reports if no use case is specified.
 */
export function getBoardsForUseCase(useCase?: UseCaseType): Set<string> {
  if (!useCase) {
    // Default: select common boards
    return new Set(['feature-requests', 'bug-reports'])
  }

  // Select boards that match the use case
  return new Set(DEFAULT_BOARD_OPTIONS.filter((b) => b.useCases.includes(useCase)).map((b) => b.id))
}

/**
 * Get boards filtered by use case for display.
 */
export function getBoardOptionsForUseCase(useCase?: UseCaseType): DefaultBoardOption[] {
  if (!useCase) {
    return DEFAULT_BOARD_OPTIONS.filter(
      (b) => b.useCases.includes('saas') || b.useCases.includes('consumer')
    )
  }

  return DEFAULT_BOARD_OPTIONS.filter((b) => b.useCases.includes(useCase))
}

/**
 * Get a human-readable label for a use case.
 */
export function getUseCaseLabel(useCase?: UseCaseType): string {
  switch (useCase) {
    case 'saas':
      return 'produtos SaaS'
    case 'consumer':
      return 'aplicativos de consumo'
    case 'marketplace':
      return 'marketplaces'
    case 'internal':
      return 'equipes'
    default:
      return 'seu produto'
  }
}
