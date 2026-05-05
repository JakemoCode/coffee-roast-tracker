import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import { ToastProvider } from "../../src/utils/Toast";
import { TempProvider } from "../../src/providers/TempContext";
import { ThemeProvider } from "../../src/providers/ThemeContext";

function createTestApolloClient() {
  return new ApolloClient({
    link: new HttpLink({ uri: "/graphql" }),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: "no-cache" },
      query: { fetchPolicy: "no-cache" },
    },
  });
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial route for MemoryRouter, e.g. "/roasts/test-id" */
  route?: string;
  /** Route path pattern, e.g. "/roasts/:id" */
  path?: string;
}

export function renderWithProviders(
  ui: React.ReactElement,
  { route = "/", path, ...renderOptions }: RenderWithProvidersOptions = {},
) {
  const client = createTestApolloClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ApolloProvider client={client}>
        <ThemeProvider>
          <ToastProvider>
            <TempProvider>
              <MemoryRouter initialEntries={[route]}>
                {path ? (
                  <Routes>
                    <Route path={path} element={children} />
                  </Routes>
                ) : (
                  children
                )}
              </MemoryRouter>
            </TempProvider>
          </ToastProvider>
        </ThemeProvider>
      </ApolloProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    client,
  };
}
