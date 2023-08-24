const Implement = require('../models/implement');
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const { cloudinary } = require("../cloudinary");


module.exports.index = async (req, res) => {
    const implements = await Implement.find({}).populate('popupText');
    res.render('implements/index', { implements })
}

module.exports.renderNewForm = (req, res) => {
    res.render('implements/new');
}

module.exports.createImplement = async (req, res, next) => {
    const geoData = await geocoder.forwardGeocode({
        query: req.body.implement.location,
        limit: 1
    }).send()
    const implement = new Implement(req.body.implement);
    implement.geometry = geoData.body.features[0].geometry;
    implement.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    implement.author = req.user._id;
    await implement.save();
    console.log(implement);
    req.flash('success', 'Successfully made a new Implement available!');
    res.redirect(`/implements/${implement._id}`)
}

module.exports.showImplement = async (req, res,) => {
    const implement = await Implement.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    if (!implement) {
        req.flash('error', 'Cannot find that Implement!');
        return res.redirect('/implements');
    }
    res.render('implements/show', { implement });
}

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const implement = await Implement.findById(id)
    if (!implement) {
        req.flash('error', 'Cannot find that Implement!');
        return res.redirect('/implements');
    }
    res.render('implements/edit', { implement });
}

module.exports.updateImplement = async (req, res) => {
    const { id } = req.params;
    console.log(req.body);
    const implement = await Implement.findByIdAndUpdate(id, { ...req.body.implement });
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    implement.images.push(...imgs);
    await implement.save();
    if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
        }
        await implement.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    }
    req.flash('success', 'Successfully updated Implement!');
    res.redirect(`/implements/${implement._id}`)
}

module.exports.deleteImplement = async (req, res) => {
    const { id } = req.params;
    await Implement.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted Implement')
    res.redirect('/implements');
}
