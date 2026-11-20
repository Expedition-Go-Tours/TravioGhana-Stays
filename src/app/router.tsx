import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import RequirePageAccess from "@/components/shared/RequirePageAccess";
import AuthOnlyRoute from "@/components/shared/AuthOnlyRoute";
import GuestRoute from "@/components/shared/GuestRoute";
import RootLayout from "./RootLayout";

// Stays workspace — property suppliers.
import StaysDashboardPage from "@/features/stays/pages/StaysDashboardPage";
import PropertiesListPage from "@/features/stays/pages/PropertiesListPage";
import PropertyPreviewPage from "@/features/stays/pages/PropertyPreviewPage";
import PropertyBuilderPage from "@/features/stays/pages/PropertyBuilderPage";
import PropertyTypeChooserPage from "@/features/stays/pages/PropertyTypeChooserPage";
import PropertyScopePage from "@/features/stays/pages/PropertyScopePage";
import PropertyBookTypePage from "@/features/stays/pages/PropertyBookTypePage";
import PropertyHomeCategoryPage from "@/features/stays/pages/PropertyHomeCategoryPage";
import PropertyHomeCountPage from "@/features/stays/pages/PropertyHomeCountPage";
import PropertyHotelCategoryPage from "@/features/stays/pages/PropertyHotelCategoryPage";
import PropertyAlternativeCategoryPage from "@/features/stays/pages/PropertyAlternativeCategoryPage";
import PropertyConfirmPage from "@/features/stays/pages/PropertyConfirmPage";
import PropertyOtherListingsPage from "@/features/stays/pages/PropertyOtherListingsPage";
import StaysBookingsPage from "@/features/stays/pages/StaysBookingsPage";
import StaysAvailabilityPage from "@/features/stays/pages/StaysAvailabilityPage";
import StaysRatesPage from "@/features/stays/pages/StaysRatesPage";
import StaysOffersPage from "@/features/stays/pages/StaysOffersPage";
import StaysOfferBuilderPage from "@/features/stays/pages/StaysOfferBuilderPage";
import StaysCancellationPage from "@/features/stays/pages/StaysCancellationPage";
import StaysFinancePage from "@/features/stays/pages/StaysFinancePage";
import StaysCustomersPage from "@/features/stays/pages/StaysCustomersPage";
import StaysReviewsPage from "@/features/stays/pages/StaysReviewsPage";
import StaysAnalyticsPage from "@/features/stays/pages/StaysAnalyticsPage";
import StaysNotificationsPage from "@/features/stays/pages/StaysNotificationsPage";
import StaysVerificationPage from "@/features/stays/pages/StaysVerificationPage";
import StaysSettingsPage from "@/features/stays/pages/StaysSettingsPage";

import AuthCallback from "@/features/auth/pages/AuthCallback";
import LoginPage from "@/features/auth/pages/LoginPage";

import TeamInvitePage from "@/pages/TeamInvitePage";

import NotFoundPage from "@/pages/errors/NotFoundPage";
import ServerErrorPage from "@/pages/errors/ServerErrorPage";
import ForbiddenPage from "@/pages/errors/ForbiddenPage";
import NetworkErrorPage from "@/pages/errors/NetworkErrorPage";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/auth/callback", element: <AuthCallback /> },
      {
        path: "/login",
        element: (
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        ),
      },
      { path: "/error/404", element: <NotFoundPage /> },
      { path: "/error/500", element: <ServerErrorPage /> },
      { path: "/error/403", element: <ForbiddenPage /> },
      { path: "/error/network", element: <NetworkErrorPage /> },
      {
        element: <AuthOnlyRoute />,
        children: [{ path: "/team/invite", element: <TeamInvitePage /> }],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              // Every route is filtered by PAGE_ACCESS (config/pageAccess.js):
              // a team member without the page's permission is sent back to the
              // dashboard instead of landing on a page whose requests all fail.
              {
                element: <RequirePageAccess />,
                children: [
                  { index: true, element: <Navigate to="/stays" replace /> },

                  { path: "stays", element: <StaysDashboardPage /> },
                  { path: "stays/properties", element: <PropertiesListPage /> },
                  // Full-page property preview (the card's eye action).
                  { path: "stays/properties/:id", element: <PropertyPreviewPage /> },
                  // Bare /build is the category chooser; the builder itself
                  // always has a draft id, or the `new` alias.
                  { path: "stays/properties/build", element: <PropertyTypeChooserPage /> },
                  // The Quick start card's intro screens.
                  { path: "stays/properties/build/quick-start", element: <PropertyScopePage /> },
                  // The Homes card asks what guests can book, then the sub-type.
                  { path: "stays/properties/build/book-type", element: <PropertyBookTypePage /> },
                  { path: "stays/properties/build/home-category", element: <PropertyHomeCategoryPage /> },
                  { path: "stays/properties/build/home-count", element: <PropertyHomeCountPage /> },
                  { path: "stays/properties/build/hotel-category", element: <PropertyHotelCategoryPage /> },
                  { path: "stays/properties/build/alternative-category", element: <PropertyAlternativeCategoryPage /> },
                  { path: "stays/properties/build/quick-start/confirm", element: <PropertyConfirmPage /> },
                  { path: "stays/properties/build/quick-start/other-listings", element: <PropertyOtherListingsPage /> },
                  { path: "stays/properties/build/:id", element: <PropertyBuilderPage />, handle: { bleed: true } },

                  { path: "stays/bookings", element: <StaysBookingsPage /> },
                  { path: "stays/customers", element: <StaysCustomersPage />, handle: { bleed: true } },
                  { path: "stays/reviews", element: <StaysReviewsPage /> },
                  { path: "stays/availability", element: <StaysAvailabilityPage /> },
                  { path: "stays/rates", element: <StaysRatesPage /> },
                  { path: "stays/special-offers", element: <StaysOffersPage /> },
                  { path: "stays/special-offers/build/:id?/:step?", element: <StaysOfferBuilderPage /> },
                  { path: "stays/cancellation", element: <StaysCancellationPage /> },
                  { path: "stays/finance", element: <StaysFinancePage /> },
                  { path: "stays/analytics", element: <StaysAnalyticsPage /> },
                  { path: "stays/notifications", element: <StaysNotificationsPage /> },
                  { path: "stays/verification", element: <StaysVerificationPage /> },
                  { path: "stays/settings", element: <StaysSettingsPage /> },
                ],
              },
              // The 404 owns its own full-screen centred layout.
              { path: "*", element: <NotFoundPage />, handle: { bleed: true } },
            ],
          },
        ],
      },
    ],
  },
]);
