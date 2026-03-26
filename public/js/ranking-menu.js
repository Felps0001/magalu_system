(function initializeRankingAccess() {
  const currentUser = window.magaluApi.readStoredUser();
  const canAccessRanking = window.magaluApi.canAccessRanking(currentUser);
  const guardedElements = document.querySelectorAll('[data-ranking-access]');
  const requiresRankingAccess = document.body.dataset.requiresRankingAccess === 'true';

  guardedElements.forEach((element) => {
    element.hidden = !canAccessRanking;
  });

  if (requiresRankingAccess) {
    if (!currentUser) {
      window.location.replace(window.magaluApi.buildAppUrl('/'));
      return;
    }

    if (window.magaluApi.requiresFirstAccess(currentUser)) {
      window.location.replace(window.magaluApi.buildAppUrl('/primeiro-acesso/'));
      return;
    }

    if (!canAccessRanking) {
      window.location.replace(window.magaluApi.buildAppUrl('/perfil/'));
      return;
    }
  }

  window.magaluRankingAccess = {
    currentUser,
    canAccessRanking,
  };
})();
