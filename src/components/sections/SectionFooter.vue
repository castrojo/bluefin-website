<script setup lang='ts'>
import { IconFacebook, IconGithubCircle, IconTwitter } from '@iconify-prerendered/vue-mdi'
</script>

<template>
  <footer>
    <div class="container">
      <div>
        <strong class="footer-title">Powered By</strong>

        <div class="logo-list">
          <img src="/brands/devpod.svg" alt="">
          <img src="/brands/devbox.svg" alt="">
          <img src="/brands/dontrememberthisbrand.svg" alt="">
          <img src="/brands/podman.svg" alt="">
          <img src="/brands/fedora.svg" alt="">
          <img src="/brands/ubuntu.svg" alt="">
        </div>
      </div>

      <div>
        <strong class="footer-title">Project Bluefin</strong>
        <p>
          Bluefin is built with Universal Blue, a community toolkit designed to consume OStree operating systems. Built
          for the love of the game. Welcome to Indie Cloud Native.
        </p>

        <ul class="footer-links">
          <li>
            <a href="#">
              <IconGithubCircle />
              Github
            </a>
          </li>
          <li>
            <a href="#">
              <IconTwitter />
              Twitter
            </a>
          </li>
          <li>
            <a href="#">
              <IconFacebook />
              Facebook
            </a>
          </li>
        </ul>

        <hr>

        <p>
          We frown upon <b>any usage</b> of AI in art. All artworks have been drawn by the talented <a href="#">Jacob
            Schnurr</a>. The
          website was designed and implemented by <a href="#">Jan Dolanský</a>.
        </p>

        <div style="flex:1;" />

        <p class="copyright">
          Copyright {{ new Date().getUTCFullYear() }} © Project bluefin
        </p>
      </div>
    </div>
  </footer>
</template>
