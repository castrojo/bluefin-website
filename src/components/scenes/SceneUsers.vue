<script setup lang="ts">
import { ref } from "vue"
import { marked } from "marked"
import SceneContent from "../common/SceneContent.vue"
import SceneVisibilityChecker from "../common/SceneVisibilityChecker.vue"
import {
  LangUsersAppendix,
  LangUsersBluefinImageURL,
  LangUsersListItems
} from "../../content"

import type { MessageSchema } from "../../locales/schema"
import { useI18n } from "vue-i18n"
const { t } = useI18n<MessageSchema>({
  useScope: "global"
})
</script>

<template>
  <section id="scene-users" class="section-wrap">
    <div class="container">
      <Transition name="fade">
        <div class="img-wrap">
          <img
            :src="LangUsersBluefinImageURL"
            :alt="t('Users.ArtworkDescription')"
          />
        </div>
      </Transition>

      <div>
        <SceneContent
          :tag="'Users.Tag'"
          :title="'Users.Title'"
          :text="'Users.Text'"
          @visible="vis = true"
        >
          <div class="brand-grid">
            <div
              v-for="item in LangUsersListItems"
              :key="item"
              class="brand-item"
            >
              <p>{{ t(item) }}</p>
            </div>
          </div>

          <div
            v-if="LangUsersAppendix"
            v-html="marked.parse(t('Users.Appendix'))"
          />
        </SceneContent>
      </div>
    </div>
    <SceneVisibilityChecker name="#scene-users" />
  </section>
</template>
