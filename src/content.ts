import { IconGithubCircle } from '@iconify-prerendered/vue-mdi'

//
//
// Landing section
//
export const LangLandingTag = 'Project'
export const LangLandingTitle = 'Bluefin'
export const LangLandingQuote = {
  text: '“Evolution is a process of constant branching and expansion”',
  author: 'Stephen Jay Gould',
  url: 'https://en.wikipedia.org/wiki/Stephen_Jay_Gould',
}
export const LangLandingBluefinImageURL = '/characters/angry.png'

//
//
// Users section
//
export const LangUsersTag = 'For'
export const LangUsersTitle = 'You'
export const LangUsersText = 'The best of both worlds: the reliability and ease of use of a Chromebook, with the power of a GNOME desktop. A custom image of Fedora designed for ease of use and performance.'
export const LangUsersListItems = [
  'Application ecosystem provided by Flathub',
  'Zero maintenance',
  'Included GPU drivers',
]
export const LangUsersBluefinImageURL = '/characters/bluefin-small.png'
export const LangUsersAppendix = `
Updates are image-based and automatic. Applications are logically separated from the system by using Flatpaks and combined with native container workflows to provide a generational leap in reliability and composability. Get what you want without sacrificing system stability. 

Images are available for your PC, M1/M2 Macs, and Framework laptops.
`

//
//
// Developers Section
//
export const LangDevsTag = 'For'
export const LangDevsTitle = 'Developers'
export const LangDevsText = 'Four developer workflows to get you started depending on where you\'re coming from, or bring your own. Wield the [industry\'s leading tools](https://landscape.cncf.io/) at your fingertips.'

export const LangDevsBoxOne = 'Built-in Ubuntu user space integrated with Visual Studio Code. Run any OCI container as your developer environment.'
export const LangDevsBoxTwo = 'Devbox and Fleek - harness the power of nix without the complexity'
export const LangDevsBoxThree = 'Devpod - developer environments as code'
export const LangDevsBoxFour = 'Homebrew on-tap'
export const LangDevsTowerImageURL = '/characters/devs.png'
export const LangDevsAppendix = `The inclusion of a [container runtime](https://glossary.cncf.io/runtime/) unlocks your team\'s potential - Bluefin is designed to be forked and extended depending on your requirements, using standard cloud-native tools and techniques.`

//
//
// Mission section
//
export const LangMissionTag = 'Our'
export const LangMissionTitle = 'Mission'
export const LangMissionText = `
Bluefin is not just software. She is a new breed of animal, adapted to survive the rigors of an ecosystem dominated by giants while protecting her family.

We believe that the desktop needs to change. That technology starts with your local computer, the device that touches your hands -- and that has to be as important as the rest of it. 

By bringing cloud-native patterns to the desktop we hope to kickstart an open source alternative to Chromebooks while also catering to the next-generation of open source contributor. 

Bluefin is about sustainability of the software, the hardware, and the people.

> There are two ways of spreading light: to be the candle or the mirror that reflects it. 
> <cite>[Edith Wharton][1]</cite>

[1]: https://en.wikipedia.org/wiki/Edith_Wharton

Or she may disembowel us on the way. Clever Girl.
`
export const LangMissionBluefinImageURL = '/characters/nest.png'

//
//
// Post mission section
//
export const LangAppendixText = `
Project Bluefin is not a finished product, she is an ongoing passion project. She represents the state of the art … a fragile, beautiful, and unique creature. The perfect predator for a world that will ultimately die. 

We must adapt. **We can do it together**.

Bluefin is built with Universal Blue, a community toolkit designed to reboot the Linux desktop. Built for the love of the game. *Welcome to indie cloud-native*.
`

// Youtube video > share > embed > copy and paste the text inside the string
export const LangAppendixYTVideo = '<iframe width="560" height="315" src="https://www.youtube.com/embed/gC7av1uSkoM?si=kaEbsIGtjT0jjRGZ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>'

//
//
// Frequently asked questions
//
export const LangFaqTag = 'Unsure?'
export const LangFaqTitle = 'FAQ'
export const LangFaqText = `
If your questions remain unanswered, 
you can reach us at [jorge@bluefin.com](jorge@bluefin.com).
`
export const LangFaqQuestions = [
  {
    question: 'What is this exactly? Why did you make a Linux distribution?',
    answer: ' Blufin uses Fedora\'s OCI deployment feature to decouple the system image from configuration. This allows for customization similar to a configuration management tool such as Ansible or Salt without the usual problems associated with custom distributions. All of Bluefin and universal blue are open source and signed by cosign. It\'s more akin to having someone install Fedora for you and set it up “the right way”. \n\n What is a cloud native model? \n\n [Check it out on YouTube](https://youtu.be/p-88GN1WVs8)',
    open: true,
  },
  {
    question: 'Where can I find more details on the features?',
    answer: 'You can find detailed information in our Github repository. \n\n [Visit Github](https://github.com/ublue-os/bluefin#readme)',
    open: true,
  },
  {
    question: 'What if I want something like KDE or another window manager?',
    answer: 'Bluefin is an opinionated GNOME experience. However Universal Blue provides a maintained set of base images for anyone to be able to make their own custom image. We hope Bluefin acts as an inspiration for others to build their own communities around user experiences. For example check out Bazzite if you want a great KDE gaming experience, similar to SteamOS',
  },
  {
    question: 'What do the -framework images do?',
    answer: 'These follow Framework\'s recommendations to swap out gnome-power-profile with tlp. The recommended settings are shipped, but allow for user-overridden configuration. We hope the framework community can help us ship a good set of configs that would allow for quick testing of battery settings so we can maintain it long term.',
  },
  {
    question: 'How do I change my shell?',
    answer: '`just zsh` or `just fish` will prompt you to switch your shell. Type `just` at the command line to see other convenience shortcuts. ',
  },
  {
    question: 'What if I don\'t like Ubuntu? What are my options?',
    answer: 'The good distros have well maintained cloud images. You can use them _all_. Bluefin/Alpine is the author\'s preferred personal setup. Bluefin consumes distro images at her leisure.',
  },
]

//
//
// Footer content
//
export const LangFooterProjectTitle = 'Project Bluefin'
export const LangFooterProject = 'Bluefin is built with Universal Blue, a community toolkit designed to reboot the Linux desktop. Built for the love of the game. Welcome to Indie Cloud Native.'
export const LangFooterReferences = 'All artwork built by humans. [Jacob Schnurr](https://www.etsy.com/listing/1425657775/cretaceous-chonkers-chonky-dinosaur) (Website and Logos) and [DragonsofWales](https://www.etsy.com/fi-en/shop/DragonsofWales?ref=profile_header) (Bluefin wallpaper). The website was designed and implemented by [Jan Dolanský](https://dolansky.dev/).'

// The icons are taken from here
// https://icones.js.org/collection/mdi
export const LangSocialLinks = [
  {
    component: IconGithubCircle,
    text: 'Github',
    link: 'https://github.com/ublue-os/bluefin',
  },
]

// Footer logos (powered-by)
interface PoweredBy { imageUrl: string; projectUrl?: string; altText: string; style?: string }
export const LangPoweredBy: PoweredBy[] = [
  {
    // This one will point to the logos saved in the public folder
    // You can also link to an external asset if needed
    imageUrl: '/brands/fedora.png',
    projectUrl: 'https://fedoraproject.org/',
    altText: 'Fedora',
  },
  {
    imageUrl: '/brands/devpod.svg',
    projectUrl: '',
    altText: 'Devpod',
  },
  {
    imageUrl: '/brands/devbox.svg',
    projectUrl: '',
    altText: 'Devbox',
  },
  {
    imageUrl: '/brands/podman-logo-dark.png',
    projectUrl: '',
    altText: 'Podman',
    // This is when you need to adjust a specific logo to your needs
    // Style is just an inline CSS style applied to the <img>
    style: 'height:68px;transform:translateY(-6px)',
  },
  {
    imageUrl: '/brands/ubuntu.svg',
    projectUrl: '',
    altText: 'Ubuntu',
  },
  {
    imageUrl: '/brands/dontrememberthisbrand.svg',
    altText: 'Distrobox',
  },
]
