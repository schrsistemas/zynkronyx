module.exports = {
  status: (req, res) => {
    res.json({ status: 'admin ok', user: req.user || null });
  }
};
