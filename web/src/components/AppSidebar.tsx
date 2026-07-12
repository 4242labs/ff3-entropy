import type { ComponentType } from 'react'
import { CalendarClock } from 'lucide-react'

import { BrandMark } from '@/components/Brand'
import { Wordmark } from '@/components/Wordmark'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

interface NavItem {
  key: string
  label: string
  icon: ComponentType<{ className?: string }>
}

// One entry per view. FF3 Entropy ships a single view today (Forecast); adding
// another later is a new row here (+ a router when there's more than one).
const NAV: NavItem[] = [{ key: 'forecast', label: 'Forecast', icon: CalendarClock }]

export function AppSidebar({ activeView = 'forecast' }: { activeView?: string }) {
  return (
    <Sidebar collapsible="icon">
      {/*
       * Header spacing is a direct port of the DS's own sidebar (`.ds-side-head`),
       * not an approximation:
       *   .ds-side-head            { gap: 22px; padding: 28px 16px 22px; }
       *   .ds-side-head .brand     { flex-direction: row; gap: 8px; margin: 12px 0; }
       *   .ds-side-head .brand svg { width: 42px; height: 42px; }   // mark
       *   [data-collapsible=icon]  { padding: 16px 0 8px; gap: 0; align-items: center; }
       *   [data-collapsible=icon] .brand svg { width: 26px; height: 26px; }
       * The FF3E wordmark's viewBox is a tight cap-height box, so its CSS height
       * IS its cap height — 21px, matching the optical size of the DS wordmark
       * in the same lockup.
       */}
      <SidebarHeader className="gap-[22px] px-[16px] pt-[28px] pb-[22px] group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-[16px] group-data-[collapsible=icon]:pb-[8px]">
        {/* justify-center: DS's `.brand` sets `justify-content: center;
            align-items: center`, and `.ds-side-head .brand` only overrides
            flex-direction to row — so the lockup stays CENTRED in the panel. */}
        <div className="my-[12px] flex flex-row items-center justify-center gap-[8px] group-data-[collapsible=icon]:m-0">
          <BrandMark className="h-[42px] w-[42px] shrink-0 text-[var(--logo)] group-data-[collapsible=icon]:h-[26px] group-data-[collapsible=icon]:w-[26px]" />
          <Wordmark className="h-[21px] text-[var(--logo)] group-data-[collapsible=icon]:hidden" />
        </div>

        <ThemeSwitch />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Views</SidebarGroupLabel>
          <SidebarMenu>
            {NAV.map((item) => (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton isActive={item.key === activeView} tooltip={item.label}>
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
