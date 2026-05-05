import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { useAuthState } from "../../lib/useAuthState";
import { useTempUnit } from "../../providers/AppProviders";
import {
  ROAST_BY_ID_QUERY,
  PUBLIC_ROAST_QUERY,
  ROASTS_BY_BEAN_QUERY,
  UPDATE_ROAST_MUTATION,
  UPDATE_ROAST_RATING,
  DELETE_ROAST_MUTATION,
  TOGGLE_ROAST_PUBLIC_MUTATION,
  SET_ROAST_FLAVORS,
  SET_ROAST_OFF_FLAVORS,
  DOWNLOAD_PROFILE_QUERY,
  FLAVOR_DESCRIPTORS_QUERY,
  MY_ROASTS_QUERY,
  ROASTS_BY_IDS_QUERY,
} from "../../graphql/operations";
import { RoastChart, type TimeSeriesEntry } from "../../components/RoastChart";
import { RoastMetricsTable } from "./RoastMetricsTable";
import { FlavorPill } from "../../components/FlavorPill";
import { FlavorPickerModal } from "../../components/modals/FlavorPickerModal";
import { StarRating } from "../../components/StarRating";
import { ConfirmDialog } from "../../components/modals/ConfirmDialog";
import { ErrorState } from "../../components/placeholders/ErrorState";
import { SkeletonLoader } from "../../components/placeholders/SkeletonLoader";
import { useToast } from "../../utils/Toast";
import { formatDate } from "../../lib/formatters";
import styles from "./RoastDetailPage.module.css";

export function RoastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userId } = useAuthState();
  const { tempUnit } = useTempUnit();
  const { showToast } = useToast();

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [showFlavorPicker, setShowFlavorPicker] = useState(false);
  const [showOffFlavorPicker, setShowOffFlavorPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Try auth query first (returns user's own roast), fall back to public query
  const isAuthenticated = !!userId;

  const {
    data: authData,
    loading: authLoading,
    error: authError,
    refetch: authRefetch,
  } = useQuery(ROAST_BY_ID_QUERY, {
    variables: { id: id! },
    skip: !id || !isAuthenticated,
  });

  // Fall back to public query when: not authenticated, OR authenticated but not the owner
  const authDone = !isAuthenticated || (!authLoading && !authError);
  const isOwner = isAuthenticated && !!authData?.roastById;
  const needsPublicFallback = !isAuthenticated || (authDone && !isOwner);

  const {
    data: publicData,
    loading: publicLoading,
    error: publicError,
    refetch: publicRefetch,
  } = useQuery(PUBLIC_ROAST_QUERY, {
    variables: { id: id! },
    skip: !id || !needsPublicFallback,
  });

  const roast = isOwner ? authData?.roastById : publicData?.roast;
  const loading = isAuthenticated ? (authLoading || (needsPublicFallback && publicLoading)) : publicLoading;
  const error = isOwner ? authError : publicError;
  const refetch = isOwner ? authRefetch : publicRefetch;

  // Fetch other roasts of the same bean (owner only)
  const { data: beanRoastsData } = useQuery(ROASTS_BY_BEAN_QUERY, {
    variables: { beanId: roast?.bean?.id ?? "" },
    skip: !isOwner || !roast?.bean?.id,
  });

  // Fetch compare roasts (full time series data)
  const { data: compareData } = useQuery(ROASTS_BY_IDS_QUERY, {
    variables: { ids: compareIds },
    skip: compareIds.length === 0,
  });

  const compareRoasts = (compareData?.roastsByIds ?? []).map((r) => ({
    label: formatDate(r.roastDate),
    timeSeriesData: (r.timeSeriesData ?? []) as TimeSeriesEntry[],
  }));

  // Flavor descriptors for picker modal
  const { data: flavorData } = useQuery(FLAVOR_DESCRIPTORS_QUERY, {
    variables: { isOffFlavor: false },
    skip: !isOwner,
  });

  const { data: offFlavorData } = useQuery(FLAVOR_DESCRIPTORS_QUERY, {
    variables: { isOffFlavor: true },
    skip: !isOwner,
  });

  // Mutations
  const [updateRoast] = useMutation(UPDATE_ROAST_MUTATION);
  const [updateRating] = useMutation(UPDATE_ROAST_RATING);
  const [deleteRoast] = useMutation(DELETE_ROAST_MUTATION, {
    refetchQueries: [{ query: MY_ROASTS_QUERY }],
  });
  const [togglePublic] = useMutation(TOGGLE_ROAST_PUBLIC_MUTATION);
  const [setFlavors] = useMutation(SET_ROAST_FLAVORS);
  const [setOffFlavors] = useMutation(SET_ROAST_OFF_FLAVORS);
  const [downloadProfile] = useLazyQuery(DOWNLOAD_PROFILE_QUERY);

  // Loading state
  if (loading) {
    return (
      <div className={styles.page} data-testid="roast-detail-page">
        <SkeletonLoader variant="card" count={3} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.page} data-testid="roast-detail-page">
        <ErrorState
          message={`Error loading roast: ${error.message}`}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Not found
  if (!roast) {
    return (
      <div className={styles.page} data-testid="roast-detail-page">
        <p className={styles.notFoundMessage}>Roast not found</p>
      </div>
    );
  }

  // Private roast viewed by non-owner
  if (!roast.isPublic && !isOwner) {
    return (
      <div className={styles.page} data-testid="roast-detail-page">
        <p className={styles.privateMessage}>This roast is private</p>
      </div>
    );
  }

  // Handlers
  async function handleRatingChange(rating: number) {
    setIsMutating(true);
    try {
      await updateRating({ variables: { id: id!, input: { rating } } });
    } catch {
      showToast("Failed to update rating", "error");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleTogglePublic() {
    const willBePublic = !roast?.isPublic;
    setIsMutating(true);
    try {
      await togglePublic({ variables: { id: id! } });
      showToast(willBePublic ? "Roast is now public" : "Roast is now private");
    } catch {
      showToast("Failed to update visibility", "error");
    } finally {
      setIsMutating(false);
    }
  }

  function handleShareLink() {
    const url = `${window.location.origin}/roasts/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    });
  }

  async function handleDeleteConfirm() {
    setIsMutating(true);
    try {
      await deleteRoast({ variables: { id: id! } });
      setShowDeleteConfirm(false);
      navigate("/");
    } catch {
      showToast("Failed to delete roast. Please try again.", "error");
    } finally {
      setIsMutating(false);
    }
  }

  function handleStartEditNotes() {
    setNotesDraft(roast?.notes ?? "");
    setIsEditingNotes(true);
  }

  async function handleSaveNotes() {
    setIsMutating(true);
    try {
      await updateRoast({ variables: { id: id!, input: { notes: notesDraft } } });
      setIsEditingNotes(false);
    } catch {
      showToast("Failed to save notes", "error");
    } finally {
      setIsMutating(false);
    }
  }

  function handleCancelNotes() {
    setIsEditingNotes(false);
  }

  async function handleSaveFlavors(selectedIds: string[]) {
    try {
      await setFlavors({ variables: { roastId: id!, descriptorIds: selectedIds } });
      setShowFlavorPicker(false);
    } catch {
      showToast("Failed to save flavors", "error");
    }
  }

  async function handleSaveOffFlavors(selectedIds: string[]) {
    try {
      await setOffFlavors({ variables: { roastId: id!, descriptorIds: selectedIds } });
      setShowOffFlavorPicker(false);
    } catch {
      showToast("Failed to save off-flavors", "error");
    }
  }

  async function handleDownloadProfile() {
    try {
      const { data } = await downloadProfile({ variables: { roastId: id! } });
      if (!data?.downloadProfile) return;
      const { fileName, content } = data.downloadProfile;
      const blob = new Blob([content], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Failed to download profile", "error");
    }
  }

  function handleToggleCompare(roastId: string) {
    setCompareIds((prev) =>
      prev.includes(roastId)
        ? prev.filter((x) => x !== roastId)
        : [...prev, roastId],
    );
  }

  const timeSeriesData = (roast.timeSeriesData ?? []) as TimeSeriesEntry[];

  const allBeanRoasts = [
    roast,
    ...(beanRoastsData?.roastsByBean ?? []).filter((r) => r.id !== roast.id),
  ];

  return (
    <div className={styles.page} data-testid="roast-detail-page">
      {/* Back link */}
      <button
        type="button"
        className={styles.backLink}
        onClick={() => navigate("/")}
      >
        &larr; My Roasts
      </button>

      {/* Header: bean name + date + rating */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h1 className={styles.beanName}>
            <Link to={`/beans/${roast.bean?.id}`} className={styles.beanLink}>
              {roast.bean?.name ?? "Unknown Bean"}
            </Link>
          </h1>
          <span className={styles.roastDate}>{formatDate(roast.roastDate)}</span>
        </div>
        <StarRating
          value={roast.rating ?? 0}
          onChange={isOwner ? handleRatingChange : undefined}
          readOnly={!isOwner}
        />
      </div>

      {/* Nudge banner for incomplete bean details */}
      {isOwner && roast.bean && !roast.bean.origin && !roast.bean.process && !roast.bean.elevation && !roast.bean.variety && (
        <button
          type="button"
          className={styles.nudgeBanner}
          onClick={() => navigate(`/beans/${roast.bean!.id}`)}
        >
          Missing origin — complete bean details for "{roast.bean.name}" &rarr;
        </button>
      )}

      {/* Chart */}
      <div className={styles.chartSection}>
        <RoastChart
          timeSeriesData={timeSeriesData}
          colourChangeTime={roast.colourChangeTime ?? undefined}
          firstCrackTime={roast.firstCrackTime ?? undefined}
          roastEndTime={roast.roastEndTime ?? undefined}
          totalDuration={roast.totalDuration ?? undefined}
          tempUnit={tempUnit}
          compareRoasts={compareRoasts}
        />
      </div>

      {/* Roast metrics — unified table: current roast + other roasts of same bean */}
      {allBeanRoasts.length > 1 && (
        <h3 className={styles.sectionHeading}>Other roasts of this bean</h3>
      )}
      <RoastMetricsTable
        currentRoastId={id!}
        roasts={allBeanRoasts}
        compareIds={compareIds}
        onToggleCompare={handleToggleCompare}
        onRowClick={(roastId) => navigate(`/roasts/${roastId}`)}
        tempUnit={tempUnit}
      />

      {/* Actions row (owner only) */}
      {isOwner && (
        <div className={styles.actionsRow} data-testid="owner-actions">
          <button
            type="button"
            className={`${styles.toggleBtn} ${roast.isPublic ? styles.toggleBtnActive : ""}`}
            onClick={handleTogglePublic}
            disabled={isMutating}
            aria-label={`Visibility: ${roast.isPublic ? "public" : "private"}. Click to make ${roast.isPublic ? "private" : "public"}.`}
          >
            {roast.isPublic ? "\uD83D\uDD13 Public" : "\uD83D\uDD12 Private"}
          </button>
          <button
            type="button"
            className={styles.shareBtn}
            onClick={handleShareLink}
          >
            {copiedShare ? "Copied!" : "Share Link"}
          </button>
          {roast.roastProfile && (
            <button
              type="button"
              className={styles.downloadBtn}
              onClick={handleDownloadProfile}
            >
              Download .kpro
            </button>
          )}
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isMutating}
          >
            Delete
          </button>
        </div>
      )}

      {/* .kpro download for non-owners if profile exists */}
      {!isOwner && roast.roastProfile && (
        <button
          type="button"
          className={styles.downloadBtn}
          onClick={handleDownloadProfile}
        >
          Download .kpro
        </button>
      )}

      {/* Notes section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Notes</h2>
          {isOwner && !isEditingNotes && (
            <button
              type="button"
              className={styles.editBtn}
              onClick={handleStartEditNotes}
            >
              Edit
            </button>
          )}
        </div>
        {isEditingNotes ? (
          <>
            <textarea
              className={styles.notesTextarea}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              aria-label="Roast notes"
            />
            <div className={styles.notesActions}>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSaveNotes}
              >
                Save
              </button>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleCancelNotes}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <p className={styles.notesText}>
            {roast.notes || "No notes yet"}
          </p>
        )}
      </div>

      {/* Flavors section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Flavors</h2>
          {isOwner && (
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => setShowFlavorPicker(true)}
            >
              Edit Flavors
            </button>
          )}
        </div>
        {roast.flavors.length > 0 ? (
          <div className={styles.pillRow}>
            {roast.flavors.map((f) => (
              <FlavorPill
                key={f.id}
                name={f.name}
                color={f.color}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>No flavors added</div>
        )}
      </div>

      {/* Off-Flavors section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Off-Flavors</h2>
          {isOwner && (
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => setShowOffFlavorPicker(true)}
            >
              Edit Off-Flavors
            </button>
          )}
        </div>
        {roast.offFlavors.length > 0 ? (
          <div className={styles.pillRow}>
            {roast.offFlavors.map((f) => (
              <FlavorPill
                key={f.id}
                name={f.name}
                color={f.color}
                variant="off-flavor"
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>None detected</div>
        )}
      </div>


      {/* Flavor picker modals */}
      {showFlavorPicker && (
        <FlavorPickerModal
          isOpen={showFlavorPicker}
          onClose={() => setShowFlavorPicker(false)}
          mode="flavors"
          descriptors={flavorData?.flavorDescriptors ?? []}
          selectedIds={roast.flavors.map((f) => f.id)}
          onSave={handleSaveFlavors}
        />
      )}
      {showOffFlavorPicker && (
        <FlavorPickerModal
          isOpen={showOffFlavorPicker}
          onClose={() => setShowOffFlavorPicker(false)}
          mode="off-flavors"
          descriptors={offFlavorData?.flavorDescriptors ?? []}
          selectedIds={roast.offFlavors.map((f) => f.id)}
          onSave={handleSaveOffFlavors}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Remove Roast"
        message="Are you sure? This roast will be permanently removed."
        confirmLabel="Yes, remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
