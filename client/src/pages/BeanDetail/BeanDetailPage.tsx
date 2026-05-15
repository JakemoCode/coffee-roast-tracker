import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuthState } from "../../lib/useAuthState";
import { useFlavorParser } from "../../lib/useFlavorParser";
import {
  PUBLIC_BEAN_QUERY,
  PUBLIC_ROASTS_QUERY,
  ROASTS_BY_BEAN_QUERY,
  UPDATE_BEAN,
  UPDATE_USER_BEAN,
  UPDATE_BEAN_SUGGESTED_FLAVORS,
  REMOVE_BEAN_MUTATION,
  FLAVOR_DESCRIPTORS_QUERY,
  MY_BEANS_QUERY,
} from "../../graphql/operations";
import { FlavorPill } from "../../components/FlavorPill";
import { RoastsTable } from "../../components/tables/RoastsTable";
import { ConfirmDialog } from "../../components/modals/ConfirmDialog";
import { ErrorState } from "../../components/placeholders/ErrorState";
import { SkeletonLoader } from "../../components/placeholders/SkeletonLoader";
import { Combobox } from "../../components/Combobox";
import { useToast } from "../../utils/Toast";
import { useTempUnit } from "../../providers/TempContext";
import type { ResultOf } from "../../graphql/graphql";
import styles from "./BeanDetailPage.module.css";

type BeanResult = ResultOf<typeof PUBLIC_BEAN_QUERY>["bean"];
type PrivateRoast = ResultOf<typeof ROASTS_BY_BEAN_QUERY>["roastsByBean"][number];
type PublicRoast = ResultOf<typeof PUBLIC_ROASTS_QUERY>["publicRoasts"][number];

const ROASTS_PAGE_SIZE = 10;

export function BeanDetailPage() {
  const { id: beanId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSignedIn, userId } = useAuthState();
  const { showToast } = useToast();
  const { tempUnit } = useTempUnit();

  // Bean data (public query works for everyone)
  const {
    data: beanData,
    loading: beanLoading,
    error: beanError,
    refetch: refetchBean,
  } = useQuery(PUBLIC_BEAN_QUERY, {
    variables: { id: beanId! },
    skip: !beanId,
  });

  // Determine ownership via myBeans
  const { data: myBeansData } = useQuery(MY_BEANS_QUERY, {
    skip: !isSignedIn,
  });

  const userBean = useMemo(() => {
    if (!myBeansData?.myBeans || !beanId) return undefined;
    return myBeansData.myBeans.find((ub) => ub.bean.id === beanId);
  }, [myBeansData, beanId]);

  const isOwner = !!userBean;

  // Roast history: logged-in owner gets their roasts, others get public roasts
  const {
    data: privateRoastsData,
    loading: privateRoastsLoading,
  } = useQuery(ROASTS_BY_BEAN_QUERY, {
    variables: { beanId: beanId! },
    skip: !beanId || !isOwner,
  });

  const [publicRoastsOffset, setPublicRoastsOffset] = useState(0);
  const {
    data: publicRoastsData,
    loading: publicRoastsLoading,
  } = useQuery(PUBLIC_ROASTS_QUERY, {
    variables: { beanId: beanId!, limit: ROASTS_PAGE_SIZE, offset: publicRoastsOffset },
    skip: !beanId || isOwner,
  });

  // Edit state — identity fields (name/origin/process/variety) are editable
  // only while the bean is sole-linked (bean.isLocked === false).
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    name: "",
    origin: "",
    process: "",
    variety: "",
    elevation: "",
    score: "",
    shortName: "",
  });

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Flavor descriptors for parsing
  const { data: flavorData } = useQuery(FLAVOR_DESCRIPTORS_QUERY);
  const flavorList = (flavorData?.flavorDescriptors ?? []).map((f: { name: string; color: string }) => ({
    name: f.name,
    color: f.color,
  }));

  // Cupping notes paste — flavor parsing seam
  const bean: BeanResult | undefined = beanData?.bean;
  const {
    text: cuppingText,
    setText: setCuppingText,
    parsed: parsedFlavors,
    isParsing: parsingNotes,
    parse: handleParseCuppingNotes,
    addManual: handleAddFlavorFromCombobox,
    remove: removeParsedFlavor,
    availableOptions: availableFlavorOptions,
    reset: resetFlavorParser,
  } = useFlavorParser({
    availableFlavors: flavorList,
    alreadySelected: bean?.suggestedFlavors ?? [],
  });

  // Mutations
  const [updateBean] = useMutation(UPDATE_BEAN, {
    refetchQueries: [{ query: PUBLIC_BEAN_QUERY, variables: { id: beanId } }],
  });
  const [updateUserBean] = useMutation(UPDATE_USER_BEAN, {
    refetchQueries: [{ query: MY_BEANS_QUERY }],
  });
  const [updateSuggestedFlavors] = useMutation(UPDATE_BEAN_SUGGESTED_FLAVORS, {
    refetchQueries: [{ query: PUBLIC_BEAN_QUERY, variables: { id: beanId } }],
  });
  const [removeBean] = useMutation(REMOVE_BEAN_MUTATION, {
    refetchQueries: [{ query: MY_BEANS_QUERY }],
  });

  const loading = beanLoading || (isOwner ? privateRoastsLoading : publicRoastsLoading);

  const rawRoasts = isOwner && privateRoastsData?.roastsByBean
    ? privateRoastsData.roastsByBean
    : publicRoastsData?.publicRoasts ?? [];

  function handleStartEdit() {
    if (!bean) return;
    setEditFields({
      name: bean.name,
      origin: bean.origin ?? "",
      process: bean.process ?? "",
      variety: bean.variety ?? "",
      elevation: bean.elevation ?? "",
      score: bean.score != null ? String(bean.score) : "",
      shortName: userBean?.shortName ?? "",
    });
    setEditing(true);
  }

  function handleCancelEdit() {
    setEditing(false);
  }

  async function handleSaveEdit() {
    if (!bean) return;
    // Identity fields are only writable while the bean is sole-linked.
    // The server enforces this; we mirror it here so the input stays minimal.
    const identityEdits = bean.isLocked
      ? {}
      : {
          name: editFields.name.trim(),
          origin: editFields.origin.trim() || null,
          process: editFields.process.trim() || null,
          variety: editFields.variety.trim() || null,
        };
    try {
      await updateBean({
        variables: {
          id: bean.id,
          input: {
            ...identityEdits,
            elevation: editFields.elevation.trim() || null,
            score: editFields.score ? parseFloat(editFields.score) : null,
          },
        },
      });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update bean",
        "error",
      );
      return;
    }
    if (userBean && editFields.shortName.trim() !== (userBean.shortName ?? "")) {
      try {
        await updateUserBean({
          variables: {
            id: userBean.id,
            shortName: editFields.shortName.trim() || null,
          },
        });
      } catch {
        showToast("Failed to update short name. Please try again.", "error");
        return;
      }
    }
    setEditing(false);
  }

  function handleSaveParsedFlavors() {
    if (!bean || parsedFlavors.length === 0) return;
    const existing = bean.suggestedFlavors ?? [];
    const merged = [...new Set([...existing, ...parsedFlavors])];
    updateSuggestedFlavors({
      variables: { beanId: bean.id, suggestedFlavors: merged },
    });
    resetFlavorParser();
  }

  function handleRemoveSuggestedFlavor(flavor: string) {
    if (!bean) return;
    const updated = (bean.suggestedFlavors ?? []).filter((f) => f !== flavor);
    updateSuggestedFlavors({
      variables: { beanId: bean.id, suggestedFlavors: updated },
    });
  }

  async function handleDeleteConfirm() {
    if (!beanId) return;
    try {
      await removeBean({ variables: { beanId } });
      setShowDeleteConfirm(false);
      navigate("/beans");
    } catch {
      showToast("Failed to remove bean. Please try again.", "error");
    }
  }

  if (loading) {
    return (
      <div className={styles.page} data-testid="bean-detail-loading">
        <SkeletonLoader variant="text" count={3} />
        <SkeletonLoader variant="card" count={1} />
        <SkeletonLoader variant="table-row" count={5} />
      </div>
    );
  }

  if (beanError) {
    return (
      <div className={styles.page}>
        <ErrorState
          message="Failed to load bean details"
          onRetry={() => refetchBean()}
        />
      </div>
    );
  }

  if (!bean) {
    return (
      <div className={styles.page}>
        <p className={styles.notFound} data-testid="bean-not-found">
          Bean not found
        </p>
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="bean-detail">
      <Link to="/beans" className={styles.backLink}>
        &larr; Back to Beans
      </Link>

      <div className={styles.header}>
        {editing && !bean.isLocked ? (
          <input
            className={styles.metaInput}
            value={editFields.name}
            onChange={(e) => setEditFields((p) => ({ ...p, name: e.target.value }))}
            aria-label="Name"
            data-testid="bean-name-input"
          />
        ) : (
          <h1 className={styles.beanName}>{bean.name}</h1>
        )}
        {isOwner && !editing && (
          <div className={styles.editBtnRow}>
            <button
              type="button"
              className={styles.editBtn}
              onClick={handleStartEdit}
              data-testid="edit-btn"
            >
              Edit
            </button>
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </button>
          </div>
        )}
        {editing && (
          <div className={styles.editBtnRow}>
            <button type="button" className={styles.saveBtn} onClick={handleSaveEdit}>
              Save
            </button>
            <button type="button" className={styles.cancelBtn} onClick={handleCancelEdit}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className={styles.metaGrid} data-testid="bean-metadata">
        <div className={styles.metaCard}>
          <div className={styles.metaLabel}>Origin</div>
          {editing && !bean.isLocked ? (
            <input
              className={styles.metaInput}
              value={editFields.origin}
              onChange={(e) => setEditFields((p) => ({ ...p, origin: e.target.value }))}
              aria-label="Origin"
            />
          ) : (
            <div className={styles.metaValue}>{bean.origin ?? "\u2014"}</div>
          )}
        </div>
        {isOwner && (
          <div className={styles.metaCard} data-testid="short-name-card">
            <div className={styles.metaLabel}>Short Name</div>
            {editing ? (
              <input
                className={styles.metaInput}
                value={editFields.shortName}
                onChange={(e) => setEditFields((p) => ({ ...p, shortName: e.target.value }))}
                placeholder="e.g. Yirg, EGB"
                aria-label="Short Name"
                data-testid="short-name-input"
              />
            ) : (
              <div className={styles.metaValue} data-testid="short-name-value">
                {userBean?.shortName ?? "\u2014"}
              </div>
            )}
          </div>
        )}
        <div className={styles.metaCard}>
          <div className={styles.metaLabel}>Process</div>
          {editing && !bean.isLocked ? (
            <input
              className={styles.metaInput}
              value={editFields.process}
              onChange={(e) => setEditFields((p) => ({ ...p, process: e.target.value }))}
              aria-label="Process"
            />
          ) : (
            <div className={styles.metaValue}>{bean.process ?? "\u2014"}</div>
          )}
        </div>
        <div className={styles.metaCard}>
          <div className={styles.metaLabel}>Variety</div>
          {editing && !bean.isLocked ? (
            <input
              className={styles.metaInput}
              value={editFields.variety}
              onChange={(e) => setEditFields((p) => ({ ...p, variety: e.target.value }))}
              aria-label="Variety"
            />
          ) : (
            <div className={styles.metaValue}>{bean.variety ?? "\u2014"}</div>
          )}
        </div>
        <div className={styles.metaCard}>
          <div className={styles.metaLabel}>Score</div>
          {editing ? (
            <input
              className={styles.metaInput}
              value={editFields.score}
              onChange={(e) => setEditFields((p) => ({ ...p, score: e.target.value }))}
              placeholder="e.g. 86"
              aria-label="Score"
            />
          ) : (
            <div className={styles.metaValue}>{bean.score != null ? bean.score : "\u2014"}</div>
          )}
        </div>
        {bean.elevation && (
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>Elevation</div>
            <div className={styles.metaValue}>{bean.elevation}</div>
          </div>
        )}
        {bean.sourceUrl && (
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>Supplier</div>
            <div className={styles.metaValue}>
              <a
                href={bean.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sourceLink}
              >
                View listing &rarr;
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Supplier Notes (suggested flavors) */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Supplier Notes</span>
        </div>
        {bean.suggestedFlavors && bean.suggestedFlavors.length > 0 ? (
          <div className={styles.pillRow} data-testid="supplier-notes">
            {bean.suggestedFlavors.map((f) => {
              const descriptor = flavorList.find((d) => d.name === f);
              return (
                <FlavorPill
                  key={f}
                  name={f}
                  color={descriptor?.color ?? "#888888"}
                  onRemove={isOwner ? () => handleRemoveSuggestedFlavor(f) : undefined}
                />
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyText}>No supplier notes</p>
        )}
      </div>

      {/* Paste supplier notes (owner only) */}
      {isOwner && (
        <div className={styles.card} data-testid="supplier-paste">
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Paste Supplier Notes</span>
          </div>
          <div className={styles.cuppingRow}>
            <textarea
              className={styles.cuppingTextarea}
              placeholder="Paste tasting notes to match flavors..."
              value={cuppingText}
              onChange={(e) => setCuppingText(e.target.value)}
              rows={3}
              aria-label="Supplier notes text"
            />
            <button
              type="button"
              className={styles.parseBtn}
              onClick={handleParseCuppingNotes}
              disabled={parsingNotes}
            >
              {parsingNotes ? "Parsing..." : "Parse"}
            </button>
          </div>
          {parsedFlavors.length > 0 && (
            <div className={styles.parsedSection}>
              <div className={styles.pillRow}>
                {parsedFlavors.map((f) => {
                  const descriptor = flavorList.find((d) => d.name === f);
                  return (
                    <FlavorPill
                      key={f}
                      name={f}
                      color={descriptor?.color ?? "#888888"}
                      onRemove={() => removeParsedFlavor(f)}
                    />
                  );
                })}
              </div>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSaveParsedFlavors}
              >
                Save Supplier Notes
              </button>
            </div>
          )}
          {flavorList.length > 0 && (
            <div className={styles.addFlavorRow}>
              <Combobox
                options={availableFlavorOptions}
                value=""
                onChange={handleAddFlavorFromCombobox}
                placeholder="Add a flavor..."
              />
            </div>
          )}
        </div>
      )}

      {/* Roast History */}
      <div className={styles.roastSection} data-testid="roast-history">
        <h2 className={styles.sectionTitle}>Roast History</h2>
        {rawRoasts.length > 0 ? (
          <RoastsTable
            roasts={rawRoasts}
            sortable
            hideBeanName
            pageSize={ROASTS_PAGE_SIZE}
            onRowClick={(roastId) =>
              navigate(`/roasts/${roastId}`, {
                state: { from: `/beans/${bean.id}` },
              })
            }
            tempUnit={tempUnit}
          />
        ) : (
          <p className={styles.emptyText} data-testid="no-roasts">
            No roasts logged for this bean yet
          </p>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Bean"
        message={`Are you sure you want to remove "${bean.name}" from your library? This will not delete any roasts associated with this bean.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
