/**
 * MADHURI'S CHOCO HEAVEN - CENTRAL BRAND & BUSINESS CONFIGURATION
 * 
 * Edit your contact details, social links, products, and gallery items here.
 * No need to modify HTML directly for routine business updates.
 */

const BRAND_CONFIG = {
  name: "Madhuri’s Choco Heaven 🍫❤️",
  shortName: "Madhuri’s Choco Heaven",
  tagline: "Where every celebration becomes a little sweeter!",
  brandMessage: "🍫 Homemade • 🎂 Freshly Baked • 🎁 Customised • ❤️ Made with Love",
  subtitle: "Handcrafted chocolates, freshly baked treats and customised creations made with love for your most special moments.",
  
  // Replace these placeholders with your actual business contact details
  contact: {
    whatsappNumber: "YOUR_WHATSAPP_NUMBER", // e.g. "919876543210" (country code + number without + or spaces)
    phoneNumber: "YOUR_PHONE_NUMBER",       // e.g. "+91 98765 43210"
    email: "YOUR_EMAIL_ADDRESS",            // e.g. "orders@madhurischocoheaven.com"
    location: "Handcrafted with love at our Home Boutique Studio",
    operatingHours: "Orders accepted 7 days a week (Pre-orders recommended)"
  },

  // Replace with your real social media links
  social: {
    instagram: "YOUR_INSTAGRAM_URL",         // e.g. "https://instagram.com/madhuris_choco_heaven"
    facebook: "YOUR_FACEBOOK_URL",           // e.g. "https://facebook.com/madhurischocoheaven"
    whatsappLink: "https://wa.me/YOUR_WHATSAPP_NUMBER"
  },

  // Featured Categories
  categories: [
    {
      id: "chocolates",
      title: "Handcrafted Chocolates",
      icon: "🍫",
      desc: "Custom chocolates made specially for your occasion with premium cocoa.",
      image: "assets/images/chocolate_truffles_box.jpg",
      badge: "Artisanal • Customisable",
      link: "#chocolates"
    },
    {
      id: "cakes",
      title: "Cakes & Celebration Cakes",
      icon: "🎂",
      desc: "Freshly baked cakes crafted to elevate birthdays, weddings & special milestones.",
      image: "assets/images/celebration_cake.jpg",
      badge: "Freshly Baked",
      link: "#cakes-bakes"
    },
    {
      id: "cupcakes",
      title: "Cupcakes & Muffins",
      icon: "🧁",
      desc: "Soft, pillowy & beautifully piped gourmet treats perfect for parties.",
      image: "assets/images/cupcakes_muffins.jpg",
      badge: "Party Favours",
      link: "#cakes-bakes"
    },
    {
      id: "brownies",
      title: "Brownies & Cookies",
      icon: "🍪",
      desc: "Rich fudgy brownies and artisan sea-salt cookies baked to sweet perfection.",
      image: "assets/images/fudgy_brownies_cookies.jpg",
      badge: "Decadent Bakes",
      link: "#cakes-bakes"
    },
    {
      id: "gifts",
      title: "Customised Gifts & Hampers",
      icon: "🎁",
      desc: "Personalised chocolate gift boxes and return gifts for memorable occasions.",
      image: "assets/images/custom_gift_hamper.jpg",
      badge: "Celebration Special",
      link: "#custom-order"
    }
  ],

  // Signature Chocolates (Strictly "Price on Request" & "Customise & Enquire")
  chocolates: [
    {
      id: "assorted-box",
      name: "Assorted Handcrafted Chocolate Box",
      desc: "An exquisite assortment of milk, dark, and white chocolate bonbons with nutty pralines, soft ganache, and golden dust.",
      priceTag: "Price on Request",
      actionText: "Customise & Enquire",
      image: "assets/images/chocolate_truffles_box.jpg",
      tags: ["Assorted", "Gift Box", "Best Seller"],
      idealFor: "Celebrations, Birthdays, Anniversaries"
    },
    {
      id: "custom-bars",
      name: "Customised Artisanal Chocolate Bars",
      desc: "Hand-poured chocolate slabs embellished with roasted pistachios, edible dried rose petals, almonds, and sea-salt flakes.",
      priceTag: "Price on Request",
      actionText: "Customise & Enquire",
      image: "assets/images/custom_chocolate_bars.jpg",
      tags: ["Custom Toppings", "Dark & Milk", "Gourmet"],
      idealFor: "Return Gifts, Personal Treats"
    },
    {
      id: "truffles-bonbons",
      name: "Artisanal Ganache Truffles",
      desc: "Velvety smooth melt-in-the-mouth cocoa truffles hand-rolled and dusted with premium cocoa powder and 24k edible gold flakes.",
      priceTag: "Price on Request",
      actionText: "Customise & Enquire",
      image: "assets/images/about_artisan_craft.jpg",
      tags: ["Pure Cocoa", "Luxury", "Hand-rolled"],
      idealFor: "Weddings, Romantic Gifting"
    },
    {
      id: "celebration-box",
      name: "Celebration Chocolate Box",
      desc: "Specially curated celebration boxes containing themed chocolates with customized greetings or initials for your milestone event.",
      priceTag: "Price on Request",
      actionText: "Customise & Enquire",
      image: "assets/images/chocolate_truffles_box.jpg",
      tags: ["Milestone", "Name Chocolates", "Themed"],
      idealFor: "Birthdays, Baby Showers"
    },
    {
      id: "personalised-chocolates",
      name: "Personalised Message Chocolates",
      desc: "Chocolates embossed with custom names, dates, or thoughtful messages crafted to express love and joy.",
      priceTag: "Price on Request",
      actionText: "Customise & Enquire",
      image: "assets/images/custom_chocolate_bars.jpg",
      tags: ["Custom Embossing", "Return Gifts"],
      idealFor: "Weddings, Anniversaries, Corporate"
    },
    {
      id: "festival-hampers",
      name: "Festival Chocolate Hampers",
      desc: "Grand festive gift boxes featuring festive-themed chocolates, roasted dry fruits, and artisanal treats packed with luxury ribbons.",
      priceTag: "Price on Request",
      actionText: "Customise & Enquire",
      image: "assets/images/custom_gift_hamper.jpg",
      tags: ["Festive Special", "Luxury Hampers", "Family Box"],
      idealFor: "Diwali, Christmas, New Year, Rakhi"
    }
  ],

  // Cakes & Fresh Bakes
  cakesAndBakes: [
    {
      id: "celebration-cake",
      name: "Custom Celebration Cakes",
      desc: "Multi-layered moist chocolate sponge dressed in velvety chocolate ganache, edible gold leaf, fresh berries, and macarons.",
      priceTag: "Price on Request",
      actionText: "Customise & Enquire",
      category: "Cakes",
      image: "assets/images/celebration_cake.jpg",
      tags: ["Custom Design", "Freshly Baked", "Centrepiece"]
    },
    {
      id: "gourmet-cupcakes",
      name: "Signature Gourmet Cupcakes",
      desc: "Fluffy vanilla and chocolate cupcakes swirled with decadent chocolate buttercream and delicate chocolate curls.",
      priceTag: "Price on Request",
      actionText: "Customise & Enquire",
      category: "Cupcakes",
      image: "assets/images/cupcakes_muffins.jpg",
      tags: ["Box of 6/12", "Party Favours", "Piped Swirls"]
    },
    {
      id: "bakery-muffins",
      name: "Fresh Baked Bakery Muffins",
      desc: "Wholesome, moist golden muffins bursting with juicy blueberries and chocolate chunks with a crunchy sugar crust.",
      priceTag: "Price on Request",
      actionText: "Customise & Enquire",
      category: "Muffins",
      image: "assets/images/cupcakes_muffins.jpg",
      tags: ["Breakfast Delight", "Soft & Moist"]
    },
    {
      id: "fudgy-brownies",
      name: "Rich Fudgy Chocolate Brownies",
      desc: "Decadently dense, crackly topped chocolate brownies made with pure dark chocolate and optional roasted walnuts.",
      priceTag: "Price on Request",
      actionText: "Customise & Enquire",
      category: "Brownies",
      image: "assets/images/fudgy_brownies_cookies.jpg",
      tags: ["Super Fudgy", "Warm & Gooey", "Best Seller"]
    },
    {
      id: "sea-salt-cookies",
      name: "Artisan Sea-Salt Choc-Chunk Cookies",
      desc: "Crisp golden edges with soft, chewy chocolate centers topped with flaky sea salt for an exquisite balance of sweet and savory.",
      priceTag: "Price on Request",
      actionText: "Customise & Enquire",
      category: "Cookies",
      image: "assets/images/fudgy_brownies_cookies.jpg",
      tags: ["Chewy Centre", "Pure Butter", "Gourmet"]
    },
    {
      id: "plum-cake",
      name: "Traditional Rich Spiced Plum Cake",
      desc: "A rich dark festive fruitcake loaded with premium dry fruits, candied orange peel, and warm spices, dusted with powdered sugar.",
      priceTag: "Price on Request",
      actionText: "Customise & Enquire",
      category: "Plum Cakes",
      image: "assets/images/festive_plum_cake.jpg",
      tags: ["Festive Specialty", "Spiced Fruits", "Traditional Recipe"]
    }
  ],

  // Occasions Showcase
  occasions: [
    {
      id: "birthdays",
      icon: "🎂",
      name: "Birthdays",
      tagline: "Celebrate another sweet year of joy!",
      treats: [
        "Birthday chocolate boxes with custom age/name",
        "Celebration theme cakes & tier cakes",
        "Decorated cupcake towers & party favours",
        "Fudgy brownie bite boxes"
      ],
      description: "From intimate family birthdays to grand milestone celebrations, our handcrafted cakes and custom chocolates make birthday smiles wider."
    },
    {
      id: "weddings",
      icon: "💍",
      name: "Weddings",
      tagline: "Pure elegance for the beginning of forever",
      treats: [
        "Luxury wedding chocolate boxes with couple initials",
        "Elegant wedding return gift hampers",
        "Custom bonbon flavours matching wedding theme",
        "Tiered chocolate ganache display cakes"
      ],
      description: "Delight your guests with couture chocolate gift boxes wrapped in satin ribbons, crafted to match your wedding color theme."
    },
    {
      id: "anniversaries",
      icon: "❤️",
      name: "Anniversaries",
      tagline: "Celebrating love, one delicious bite at a time",
      treats: [
        "Romantic truffle boxes with edible gold leaf",
        "Heart-shaped chocolates and custom messages",
        "Gourmet brownie and chocolate lovers hamper",
        "Romantic duo celebration cakes"
      ],
      description: "Express your heart with romantic handcrafted chocolates made with passion and personalized love notes."
    },
    {
      id: "baby-showers",
      icon: "👶",
      name: "Baby Showers",
      tagline: "Welcoming sweet new beginnings",
      treats: [
        "Pastel-themed baby shower cupcakes",
        "Personalised chocolate bars with announcement cards",
        "Cute mini chocolate return gifts for guests",
        "Celebration fruit & sponge cakes"
      ],
      description: "Celebrate the arrival of your little miracle with charming pastel-themed chocolates, cupcakes, and customized baby shower favors."
    },
    {
      id: "festivals",
      icon: "🎉",
      name: "Festivals",
      tagline: "Sweeten festive traditions with artisanal touches",
      treats: [
        "Diwali & Rakhi handcrafted chocolate hampers",
        "Christmas festive spiced plum cakes",
        "New Year celebration assorted chocolate boxes",
        "Dry fruit filled artisanal chocolate bars"
      ],
      description: "Elevate your festive gifting with artisanal homemade hampers that bring warmth and sweetness to every relative and friend."
    },
    {
      id: "return-gifts",
      icon: "🎁",
      name: "Return Gifts",
      tagline: "Memorable favours your guests will truly savour",
      treats: [
        "Individually boxed custom chocolate duos and trios",
        "Personalised thank-you message chocolate sleeves",
        "Mini brownie boxes with custom ribbon tags",
        "Budget-friendly to luxury return gift options"
      ],
      description: "Leave a lasting impression with beautifully wrapped homemade treats tailored for your guests to take home."
    },
    {
      id: "corporate",
      icon: "🏢",
      name: "Corporate Gifting",
      tagline: "Professional excellence with warm artisanal flair",
      treats: [
        "Branded packaging with company greetings",
        "Gourmet assorted truffle executive gift boxes",
        "Festival celebration employee hampers",
        "Client appreciation confectionery packages"
      ],
      description: "Say thank you to clients, partners, and teams with premium handcrafted chocolates that reflect prestige and care."
    },
    {
      id: "special-celebrations",
      icon: "✨",
      name: "Special Celebrations",
      tagline: "Housewarmings, graduations, achievements & get-togethers",
      treats: [
        "Congratulatory chocolate gift hampers",
        "Party dessert table platters (cupcakes & brownies)",
        "Assorted cookie gift jars",
        "Custom message chocolate plaques"
      ],
      description: "Whatever you are celebrating, our homemade treats are customized to make your moment unforgettable."
    }
  ],

  // How It Works Steps
  howItWorks: [
    {
      step: "01",
      title: "Tell Us Your Idea",
      desc: "Share your occasion, preferred treats, theme, budget, and date through our simple form or WhatsApp.",
      icon: "💡"
    },
    {
      step: "02",
      title: "We Handcraft With Care",
      desc: "Your chocolates or baked treats are freshly prepared using premium ingredients and hygienic home-kitchen standards.",
      icon: "🍫"
    },
    {
      step: "03",
      title: "We Customise & Pack",
      desc: "Packaging, ribbons, labels, and personal messages are carefully tailored to make your gifts look breathtaking.",
      icon: "🎀"
    },
    {
      step: "04",
      title: "Sweet Moments Begin",
      desc: "Your fresh order is safely prepared and handed over/delivered in perfect condition ready for your celebration.",
      icon: "🥳"
    }
  ],

  // Why Choose Us
  whyChooseUs: [
    {
      icon: "❤️",
      title: "Made With Love",
      desc: "Every chocolate and bake is created with personal warmth and homemade care that commercial brands cannot replicate."
    },
    {
      icon: "🍫",
      title: "100% Handcrafted",
      desc: "Artisanal hand-tempered chocolates made in small batches to preserve taste, texture, and velvety richness."
    },
    {
      icon: "🎂",
      title: "Freshly Baked on Order",
      desc: "We never sell pre-stored items. Every cake, cupcake, muffin, and brownie is baked fresh specifically for your order."
    },
    {
      icon: "🎁",
      title: "Tailored Customisation",
      desc: "From ribbons and custom labels to bespoke flavours and dietary requirements, your wish is our recipe."
    },
    {
      icon: "✨",
      title: "Perfect For Every Occasion",
      desc: "Curated collections for birthdays, weddings, baby showers, festive hampers, and return gifts."
    },
    {
      icon: "🌟",
      title: "Hygienic & Premium Ingredients",
      desc: "Prepared in an impeccably clean home kitchen using top-grade cocoa, pure butter, and fresh wholesome ingredients."
    }
  ],

  // Gallery Items (Filterable + Lightbox)
  gallery: [
    {
      id: "gal-1",
      title: "Assorted Gold Leaf Truffle Collection",
      category: "chocolates",
      categoryLabel: "Handcrafted Chocolates",
      image: "assets/images/chocolate_truffles_box.jpg",
      caption: "Handcrafted truffles dusted with 24k gold leaf and pistachio pearls in a luxury gift box."
    },
    {
      id: "gal-2",
      title: "Tiered Chocolate Velvet Celebration Cake",
      category: "cakes",
      categoryLabel: "Cakes & Bakes",
      image: "assets/images/celebration_cake.jpg",
      caption: "Two-tiered chocolate ganache celebration cake with fresh berries and macarons."
    },
    {
      id: "gal-3",
      title: "Artisanal Chocolate Bar Trio",
      category: "chocolates",
      categoryLabel: "Handcrafted Chocolates",
      image: "assets/images/custom_chocolate_bars.jpg",
      caption: "Rose pistachio dark chocolate, hazelnut milk chocolate, and raspberry white chocolate."
    },
    {
      id: "gal-4",
      title: "Grand Celebration Gift Hamper",
      category: "gifts",
      categoryLabel: "Gift Hampers",
      image: "assets/images/custom_gift_hamper.jpg",
      caption: "Opulent hamper basket packed with chocolate boxes, brownies, gourmet jars, and personalized card."
    },
    {
      id: "gal-5",
      title: "Gourmet Frosted Cupcakes & Muffins",
      category: "cakes",
      categoryLabel: "Cakes & Bakes",
      image: "assets/images/cupcakes_muffins.jpg",
      caption: "Swirled chocolate ganache cupcakes and freshly baked golden blueberry muffins."
    },
    {
      id: "gal-6",
      title: "Fudgy Walnut Brownies & Chewy Cookies",
      category: "cakes",
      categoryLabel: "Cakes & Bakes",
      image: "assets/images/fudgy_brownies_cookies.jpg",
      caption: "Rich fudgy chocolate brownies paired with artisanal sea-salt chocolate chunk cookies."
    },
    {
      id: "gal-7",
      title: "Hand-Rolled Ganache Cocoa Truffles",
      category: "chocolates",
      categoryLabel: "Handcrafted Chocolates",
      image: "assets/images/about_artisan_craft.jpg",
      caption: "Handcrafted in small batches, dusted with cocoa powder and cinnamon essence."
    },
    {
      id: "gal-8",
      title: "Festive Spiced Holiday Plum Cake",
      category: "cakes",
      categoryLabel: "Cakes & Bakes",
      image: "assets/images/festive_plum_cake.jpg",
      caption: "Traditional rich plum cake loaded with soaked dry fruits, star anise, and cinnamon."
    },
    {
      id: "gal-9",
      title: "Artisan Chocolate Boutique Spread",
      category: "chocolates",
      categoryLabel: "Handcrafted Chocolates",
      image: "assets/images/hero_chocolate_spread.jpg",
      caption: "A celebratory spread of homemade dark chocolate barks, bonbons, and celebration slices."
    }
  ],

  // Realistic Testimonial Placeholders (clearly labeled for replacement)
  testimonials: [
    {
      id: "t-1",
      name: "Sneha & Rahul M.",
      occasion: "Wedding Return Gifts (120 Boxes)",
      rating: 5,
      quote: "Beautifully made chocolates and the packaging was absolutely lovely! Every single wedding guest complimented the taste and presentation. Madhuri was so cooperative with our custom color theme.",
      date: "Recent Customer"
    },
    {
      id: "t-2",
      name: "Pooja K.",
      occasion: "Daughter's 5th Birthday Party",
      rating: 5,
      quote: "The chocolate drip cake and matching cupcakes were the star of the party! So fresh, moist, and not overly sweet. The kids and adults both loved it. Definitely our go-to family baker now!",
      date: "Recent Customer"
    },
    {
      id: "t-3",
      name: "Vikram S.",
      occasion: "Diwali Corporate Hampers",
      rating: 5,
      quote: "We ordered customized chocolate hampers for our key clients. The handcrafted finish, personalized greeting, and pure quality made an unforgettable impression. Exceptional professionalism!",
      date: "Recent Customer"
    },
    {
      id: "t-4",
      name: "Ananya R.",
      occasion: "First Wedding Anniversary",
      rating: 5,
      quote: "Ordered an assorted dark chocolate truffle box with our initials embossed. The texture was velvety smooth and melted in the mouth. It made our anniversary celebration truly special!",
      date: "Recent Customer"
    }
  ],

  // Social / Instagram Grid Items
  socialPosts: [
    { image: "assets/images/chocolate_truffles_box.jpg", tag: "#ChocoHeavenTruffles" },
    { image: "assets/images/celebration_cake.jpg", tag: "#CelebrationCakes" },
    { image: "assets/images/custom_chocolate_bars.jpg", tag: "#ArtisanBars" },
    { image: "assets/images/cupcakes_muffins.jpg", tag: "#FreshBakes" },
    { image: "assets/images/fudgy_brownies_cookies.jpg", tag: "#FudgyBrownies" },
    { image: "assets/images/custom_gift_hamper.jpg", tag: "#GiftHampers" }
  ]
};

// Export to window for global browser access
if (typeof window !== "undefined") {
  window.BRAND_CONFIG = BRAND_CONFIG;
}
